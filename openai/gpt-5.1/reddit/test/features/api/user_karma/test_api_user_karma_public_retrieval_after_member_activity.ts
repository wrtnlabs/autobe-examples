import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";

/**
 * Validate that a member user's aggregated karma becomes publicly retrievable
 * after they have created a post and a comment.
 *
 * Business flow:
 *
 * 1. Register (join) a new member user and obtain their memberUserId.
 * 2. As that user, create a community.
 * 3. Create a membership for the user in that community.
 * 4. As the same user, create a post in the community.
 * 5. Create a comment on that post.
 * 6. As a public (unauthenticated) caller, retrieve the aggregated karma via GET
 *    /communityPlatform/userKarmas/byMemberUser/{memberUserId}.
 * 7. Validate that the karma record matches the user and has non-negative
 *    component scores.
 */
export async function test_api_user_karma_public_retrieval_after_member_activity(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Allow backend to infer IP if omitted / null
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  const memberUserId: string & tags.Format<"uuid"> = authorized.id;

  // 2. Create a community as this member user
  const communityCreateBody = {
    slug: `community_${RandomGenerator.alphabets(8)}`,
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a membership in that community for the current member user
  const membershipCreateBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // Validate membership links
  TestValidator.equals(
    "membership community slug matches created community",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership memberUser id matches joined user",
    membership.memberUser.id,
    memberUserId,
  );

  // 4. Create a post in the community as this member user
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
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "post community id matches created community",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author matches joined member user",
    post.author_memberuser_id,
    memberUserId,
  );

  // 5. Create a top-level comment on the post as this member user
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
  typia.assert<ICommunityPlatformComment>(comment);

  TestValidator.equals(
    "comment post id matches post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment author matches joined member user",
    comment.author.id,
    memberUserId,
  );

  // 6. Prepare an unauthenticated (public) connection by resetting headers
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Retrieve aggregated user karma as a public caller
  const karma: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.userKarmas.byMemberUser.at(
      publicConnection,
      {
        memberUserId,
      },
    );
  typia.assert<ICommunityPlatformUserKarma>(karma);

  // 8. Business assertions on karma structure and non-negativity
  TestValidator.equals(
    "karma record belongs to joined member user",
    karma.memberUserId,
    memberUserId,
  );

  TestValidator.predicate("totalKarma is non-negative", karma.totalKarma >= 0);
  TestValidator.predicate("postKarma is non-negative", karma.postKarma >= 0);
  TestValidator.predicate(
    "commentKarma is non-negative",
    karma.commentKarma >= 0,
  );

  TestValidator.predicate(
    "totalKarma is at least postKarma",
    karma.totalKarma >= karma.postKarma,
  );
  TestValidator.predicate(
    "totalKarma is at least commentKarma",
    karma.totalKarma >= karma.commentKarma,
  );
}
