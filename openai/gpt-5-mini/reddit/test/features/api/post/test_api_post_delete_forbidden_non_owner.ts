import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

/**
 * Validate that non-owner members cannot delete another member's post.
 *
 * Business context:
 *
 * - Members may create communities and posts. Only the post author (owner) or
 *   authorized moderators/admins may delete a post. Regular members who are not
 *   the post owner must be forbidden from deleting someone else's post.
 *
 * Test steps:
 *
 * 1. Create two member accounts (author and non-owner) using separate connection
 *    clones so each account holds its own authorization token.
 * 2. As the author: create a community, optionally subscribe, and create a text
 *    post. Capture the created post id.
 * 3. As the non-owner: attempt DELETE on the post and assert HTTP 403 Forbidden
 *    using TestValidator.httpError.
 * 4. As the author: perform DELETE on the same post and expect success (no thrown
 *    error). This demonstrates the post remained intact after the unauthorized
 *    attempt and ownership checks prevented deletion by the non-owner.
 */
export async function test_api_post_delete_forbidden_non_owner(
  connection: api.IConnection,
) {
  // 0. Prepare isolated connections for two users
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const nonOwnerConn: api.IConnection = { ...connection, headers: {} };

  // 1. Register the author account
  const authorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(authorConn, {
      body: authorBody,
    });
  typia.assert(author);

  // 2. Register the non-owner account
  const nonOwnerBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const nonOwner: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(nonOwnerConn, {
      body: nonOwnerBody,
    });
  typia.assert(nonOwner);

  // 3. As the author, create a community
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(authorConn, {
      body: communityBody,
    });
  typia.assert(community);

  // 4. (Optional) Subscribe the author to the community
  const subscriptionBody = {
    community_id: community.id,
  } satisfies ICommunityPortalSubscription.ICreate;

  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      authorConn,
      {
        communityId: community.id,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  // 5. As the author, create a text post
  const postCreateBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate.IText;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(authorConn, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. As the non-owner, attempt to delete the post and expect 403 Forbidden
  await TestValidator.httpError(
    "non-owner should not be allowed to delete another user's post",
    403,
    async () => {
      await api.functional.communityPortal.member.posts.erase(nonOwnerConn, {
        postId: post.id,
      });
    },
  );

  // 7. As the author (owner), delete the post successfully. If this succeeds,
  //    it proves the post was not deleted by the non-owner attempt.
  await api.functional.communityPortal.member.posts.erase(authorConn, {
    postId: post.id,
  });

  // 8. Final assertion: owner delete succeeded after unauthorized attempt.
  TestValidator.predicate(
    "owner can delete post after unauthorized delete attempt",
    true,
  );
}
