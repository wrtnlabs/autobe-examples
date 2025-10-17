import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate that an admin can remove user votes from a post, including all
 * business side effects.
 *
 * Steps:
 *
 * 1. Register a new admin and authenticate as admin.
 * 2. Create a community as a member (implicit in API, no member join endpoint
 *    exposed).
 * 3. Create a post as admin (API only exposes admin post creation endpoint,
 *    assumed to have proper permissions).
 * 4. Cast a vote as a member (API assumes admin context can do both).
 * 5. Remove the member's vote as admin.
 * 6. Confirm the vote is deleted: attempt to remove it again results in
 *    error/no-op.
 * 7. (If possible) inspect post score and user karma after removal for
 *    consistency.
 * 8. Ensure only admins can remove votes using this endpoint.
 */
export async function test_api_post_vote_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!!",
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin is superuser", admin.superuser, true);

  // 2. Create a community
  const communityInput = {
    name: RandomGenerator.name(1).toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name matches",
    community.name,
    communityInput.name,
  );

  // 3. Create a post as admin
  const postInput = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    content_body: RandomGenerator.content({ paragraphs: 2 }),
    content_type: RandomGenerator.pick(["text", "image", "link"] as const),
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.create(connection, {
      body: postInput,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community id matches",
    post.community_platform_community_id,
    community.id,
  );

  // 4. Cast a vote as member (upvote)
  // (Assume admin context for member since member auth is not exposed.)
  const voteInput = {
    vote_value: 1,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: voteInput,
      },
    );
  typia.assert(vote);
  TestValidator.equals("vote is upvote", vote.vote_value, 1);
  TestValidator.equals(
    "vote references correct post",
    vote.community_platform_post_id,
    post.id,
  );

  // 5. Remove the vote as admin
  await api.functional.communityPlatform.admin.posts.votes.erase(connection, {
    postId: post.id,
    voteId: vote.id,
  });
  // At this point, vote is supposed to be removed (soft-deleted or hard-deleted).

  // 6. Try removing again (should fail or be a no-op)
  await TestValidator.error(
    "removing already-removed vote returns error or is no-op",
    async () => {
      await api.functional.communityPlatform.admin.posts.votes.erase(
        connection,
        {
          postId: post.id,
          voteId: vote.id,
        },
      );
    },
  );

  // 7. Documentation: Normally, we'd now verify post score and user karma were updated
  // -- but there is no API to directly check these, so only note this expectation.

  // 8. Attempt removal with non-admin should not work (simulate by stripping connection headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot use admin vote removal API",
    async () => {
      await api.functional.communityPlatform.admin.posts.votes.erase(
        unauthConn,
        {
          postId: post.id,
          voteId: vote.id,
        },
      );
    },
  );
}
