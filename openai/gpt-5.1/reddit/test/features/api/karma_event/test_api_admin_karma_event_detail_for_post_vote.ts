import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformKarmaEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaEvent";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaEvent";

/**
 * Validate that an adminUser can retrieve detailed karma event information for
 * a post vote.
 *
 * Business flow:
 *
 * 1. Admin user joins (for later admin queries).
 * 2. Two member users join: author and voter.
 * 3. Author logs in, creates a community, and joins it.
 * 4. Voter logs in and joins the same community.
 * 5. Author creates a text post in that community.
 * 6. Voter casts an up-vote on the post.
 * 7. Admin uses karmaEvents.index to search events filtered by author and post.
 * 8. Admin uses karmaEvents.at to fetch detail for the identified event.
 * 9. Assertions verify linkage between event, member, post, and karma deltas.
 */
export async function test_api_admin_karma_event_detail_for_post_vote(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Adm1nP@ssw0rd";

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdminUserJoin.IRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Two member users join: author and voter
  const baseHref = "https://client.example.com/join";
  const baseReferrer = "https://client.example.com/landing";

  const authorJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: "AuthorPass123",
        ip: null,
        href: baseHref,
        referrer: baseReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
  typia.assert(authorJoin);

  const voterJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: "VoterPass123",
        ip: null,
        href: baseHref,
        referrer: baseReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
  typia.assert(voterJoin);

  // 3. Author logs in (ensure session) and creates a community
  const authorLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: authorJoin.email,
        password: "AuthorPass123",
        ip: null,
        href: baseHref,
        referrer: baseReferrer,
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });
  typia.assert(authorLogin);

  const communitySlug = `comm-${RandomGenerator.alphaNumeric(8)}`;
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3b. Author joins the community
  const authorMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          role: "member",
          isApproved: true,
          isBanned: false,
        } satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(authorMembership);

  // 4. Voter logs in and joins same community
  const voterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: voterJoin.email,
        password: "VoterPass123",
        ip: null,
        href: baseHref,
        referrer: baseReferrer,
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });
  typia.assert(voterLogin);

  const voterMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          role: "member",
          isApproved: true,
          isBanned: false,
        } satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(voterMembership);

  // 5. Author logs in again and creates a post in the community
  const authorLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: authorJoin.email,
        password: "AuthorPass123",
        ip: null,
        href: baseHref,
        referrer: baseReferrer,
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });
  typia.assert(authorLoginAgain);

  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. Voter logs in and casts an up-vote on the post
  const voterLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: voterJoin.email,
        password: "VoterPass123",
        ip: null,
        href: baseHref,
        referrer: baseReferrer,
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });
  typia.assert(voterLoginAgain);

  const voteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: voteBody,
      },
    );
  typia.assert(vote);

  // 7. Admin logs in for event inspection
  const adminLoginAgain: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        ip: null,
        href: baseHref,
        referrer: baseReferrer,
      } satisfies ICommunityPlatformAdminUserLogin.IRequest,
    });
  typia.assert(adminLoginAgain);

  // 8. Search for karma events related to the author and post
  const eventsPage: IPageICommunityPlatformKarmaEvent.ISummary =
    await api.functional.communityPlatform.adminUser.karmaEvents.index(
      connection,
      {
        body: {
          memberuser_id: authorJoin.id,
          post_id: post.id,
          comment_id: undefined,
          event_type: undefined,
          min_created_at: null,
          max_created_at: null,
          page: 1,
          limit: 50,
          sort_direction: "desc",
        } satisfies ICommunityPlatformKarmaEvent.IRequest,
      },
    );
  typia.assert(eventsPage);

  // 9. Find the karma event corresponding to the post vote
  const summaries = eventsPage.data;
  TestValidator.predicate(
    "karma events should not be empty for the author and post after vote",
    summaries.length > 0,
  );

  const matchingEventSummary = summaries.find((ev) => {
    return (
      ev.memberuser.id === authorJoin.id &&
      ev.post !== null &&
      ev.post !== undefined &&
      ev.post.id === post.id
    );
  });

  TestValidator.predicate(
    "should find a karma event for the authored post",
    matchingEventSummary !== undefined,
  );

  if (!matchingEventSummary) return;

  // 10. Fetch full detail of the karma event
  const karmaEventDetail: ICommunityPlatformKarmaEvent =
    await api.functional.communityPlatform.adminUser.karmaEvents.at(
      connection,
      {
        karmaEventId: matchingEventSummary.id,
      },
    );
  typia.assert(karmaEventDetail);

  // 11. Validate relationships and karma deltas
  TestValidator.equals(
    "memberuser_id in detail should match author id",
    karmaEventDetail.memberuser_id,
    authorJoin.id,
  );

  TestValidator.equals(
    "embedded memberuser summary id should match author id",
    karmaEventDetail.memberuser.id,
    authorJoin.id,
  );

  TestValidator.equals(
    "embedded memberuser summary username should match join username",
    karmaEventDetail.memberuser.username,
    authorJoin.username,
  );

  TestValidator.equals(
    "post_id in karma event should match embedded post id or be null consistently",
    karmaEventDetail.post_id ?? null,
    karmaEventDetail.post ? karmaEventDetail.post.id : null,
  );

  if (karmaEventDetail.post) {
    TestValidator.equals(
      "embedded post summary id should match created post id",
      karmaEventDetail.post.id,
      post.id,
    );
  }

  TestValidator.equals(
    "comment_karma_delta should be zero for a pure post vote event",
    karmaEventDetail.comment_karma_delta,
    0,
  );

  TestValidator.predicate(
    "post_karma_delta should be non-zero for a post vote event (positive for upvote)",
    karmaEventDetail.post_karma_delta !== 0,
  );

  TestValidator.predicate(
    "total_karma_after should reflect at least the applied delta (assuming non-negative total)",
    karmaEventDetail.total_karma_after >=
      karmaEventDetail.post_karma_delta + karmaEventDetail.comment_karma_delta,
  );
}
