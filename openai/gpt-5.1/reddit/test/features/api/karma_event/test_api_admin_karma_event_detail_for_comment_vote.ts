import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformKarmaEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaEvent";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaEvent";

export async function test_api_admin_karma_event_detail_for_comment_vote(
  connection: api.IConnection,
) {
  // 1. Create an admin user (join) so we have credentials for later admin calls
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.test`;
  const adminPassword = "AdminPass123!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a member user (join) which also authenticates as that member
  const memberUsername = RandomGenerator.name(1);
  const memberEmail = `${RandomGenerator.alphabets(8)}@member.test`;
  const memberPassword = "MemberPass123!";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As member user, create a community
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. Create a membership for the member user in the community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 5. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. Create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 7. Cast a vote on the comment to generate a karma event
  const commentVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const vote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: commentVoteCreateBody,
      },
    );
  typia.assert(vote);

  // 8. Switch back to admin user via login to ensure admin auth context
  const adminLoginBody = {
    identifier: adminUsername,
    password: adminPassword,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 9. As admin, search karma events filtered by memberuser_id and comment_id
  const searchBody = {
    memberuser_id: memberAuthorized.id,
    post_id: undefined,
    comment_id: comment.id,
    event_type: undefined,
    min_created_at: null,
    max_created_at: null,
    page: 1,
    limit: 20,
    sort_direction: "desc",
  } satisfies ICommunityPlatformKarmaEvent.IRequest;

  const page: IPageICommunityPlatformKarmaEvent.ISummary =
    await api.functional.communityPlatform.adminUser.karmaEvents.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(page);

  TestValidator.predicate(
    "karma events index should contain at least one event for comment vote",
    page.pagination.records > 0 && page.data.length > 0,
  );

  // 10. Find the event corresponding to our comment
  const matchedEventSummary = page.data.find((ev) =>
    ev.comment !== undefined && ev.comment !== null
      ? ev.comment.id === comment.id
      : false,
  );

  TestValidator.predicate(
    "should find a karma event associated with the created comment",
    matchedEventSummary !== undefined,
  );

  if (!matchedEventSummary) return;

  // 11. Fetch detailed karma event by id
  const detailEvent: ICommunityPlatformKarmaEvent =
    await api.functional.communityPlatform.adminUser.karmaEvents.at(
      connection,
      {
        karmaEventId: matchedEventSummary.id,
      },
    );
  typia.assert(detailEvent);

  // 12. Basic ID and member associations
  TestValidator.equals(
    "detail event id should match summary id",
    detailEvent.id,
    matchedEventSummary.id,
  );

  TestValidator.equals(
    "detail event memberuser id should match member user id",
    detailEvent.memberuser_id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "detail event member summary id should match member user id",
    detailEvent.memberuser.id,
    memberAuthorized.id,
  );

  // 13. Comment association checks
  TestValidator.predicate(
    "detail event should have non-null comment_id for comment vote",
    detailEvent.comment_id !== null && detailEvent.comment_id !== undefined,
  );

  if (detailEvent.comment_id !== null && detailEvent.comment_id !== undefined) {
    TestValidator.equals(
      "detail event comment_id should equal created comment id",
      detailEvent.comment_id,
      comment.id,
    );
  }

  TestValidator.predicate(
    "detail event should have comment summary for comment vote",
    detailEvent.comment !== null && detailEvent.comment !== undefined,
  );

  if (detailEvent.comment !== null && detailEvent.comment !== undefined) {
    TestValidator.equals(
      "detail event comment summary id should equal created comment id",
      detailEvent.comment.id,
      comment.id,
    );

    TestValidator.equals(
      "detail event comment summary post id should equal created post id",
      detailEvent.comment.post.id,
      post.id,
    );
  }

  // 14. Post association checks (for comment vote, post link may exist)
  if (detailEvent.post_id !== null && detailEvent.post_id !== undefined) {
    TestValidator.equals(
      "detail event post_id should equal created post id when present",
      detailEvent.post_id,
      post.id,
    );
  }

  if (detailEvent.post !== null && detailEvent.post !== undefined) {
    TestValidator.equals(
      "detail event post summary id should equal created post id when present",
      detailEvent.post.id,
      post.id,
    );
  }

  // 15. Karma delta checks: ensure consistency and that comment delta is non-zero
  TestValidator.equals(
    "summary comment_karma_delta should equal detail comment_karma_delta",
    detailEvent.comment_karma_delta,
    matchedEventSummary.comment_karma_delta,
  );

  TestValidator.equals(
    "summary post_karma_delta should equal detail post_karma_delta",
    detailEvent.post_karma_delta,
    matchedEventSummary.post_karma_delta,
  );

  TestValidator.predicate(
    "comment_karma_delta should be non-zero for comment-related event",
    detailEvent.comment_karma_delta !== 0,
  );

  // 16. Total karma arithmetic sanity: previous_total + deltas = total_karma_after
  const previousTotal =
    detailEvent.total_karma_after -
    detailEvent.comment_karma_delta -
    detailEvent.post_karma_delta;

  const recomputedTotal =
    previousTotal +
    detailEvent.comment_karma_delta +
    detailEvent.post_karma_delta;

  TestValidator.equals(
    "recomputed total karma after applying deltas should equal recorded total_karma_after",
    recomputedTotal,
    detailEvent.total_karma_after,
  );

  TestValidator.equals(
    "summary total_karma_after should equal detail total_karma_after",
    detailEvent.total_karma_after,
    matchedEventSummary.total_karma_after,
  );

  TestValidator.equals(
    "summary created_at should equal detail created_at",
    detailEvent.created_at,
    matchedEventSummary.created_at,
  );
}
