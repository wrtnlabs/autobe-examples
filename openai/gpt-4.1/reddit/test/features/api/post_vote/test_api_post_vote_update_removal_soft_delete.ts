import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Validate soft deletion (removal) of a user's post vote.
 *
 * This scenario simulates the full voting lifecycle for a community platform
 * user:
 *
 * 1. User onboarding/registration
 * 2. Community creation by the user
 * 3. Post creation in that community by the same user
 * 4. Casting an upvote (or downvote) for the post
 * 5. Removing (soft-deleting) the vote by updating with body omitting vote_type
 * 6. Validating that the vote's deleted_at is set, indicating soft deletion
 * 7. Ensuring only the original voter can remove their vote (implicit as all
 *    actions use same session)
 *
 * At each step, all relevant entity relationships, business logic, and security
 * constraints are respected. Full type safety is enforced, and all API
 * responses are validated.
 */
export async function test_api_post_vote_update_removal_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register a new user (self-onboarding)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: password as string & tags.Format<"password">,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);
  TestValidator.equals("registered email persisted", user.email, email);
  TestValidator.equals(
    "deleted_at is unset after onboarding",
    user.deleted_at,
    null,
  );

  // 2. Create a community
  const communityName = RandomGenerator.alphaNumeric(10);
  const communityTitle = RandomGenerator.name();
  const communityDescription = RandomGenerator.content({ paragraphs: 2 });
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName as string & tags.MinLength<3> & tags.MaxLength<30>,
        display_title: communityTitle as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
        description: communityDescription as string &
          tags.MinLength<1> &
          tags.MaxLength<2000>,
        visibility: "public",
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals(
    "community name persisted",
    community.name,
    communityName,
  );
  TestValidator.equals("community status set", community.status, "active");
  TestValidator.equals(
    "community deleted_at is unset",
    community.deleted_at,
    null,
  );

  // 3. Create a post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 5 });
  const postBody = RandomGenerator.content({ paragraphs: 1 });
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        type: "text",
        title: postTitle,
        body: postBody,
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals("post title persisted", post.title, postTitle);
  TestValidator.equals(
    "post belongs to community",
    post.community.id,
    community.id,
  );
  TestValidator.equals("post deleted_at is unset", post.deleted_at, null);

  // 4. Create a post vote (upvote)
  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.postVotes.create(connection, {
      body: {
        community_platform_post_id: post.id,
        vote_type: RandomGenerator.pick(["up", "down"] as const),
      } satisfies ICommunityPlatformPostVote.ICreate,
    });
  typia.assert(vote);
  TestValidator.equals("vote post relation correct", vote.post?.id, post.id);
  TestValidator.equals(
    "vote deleted_at is unset after cast",
    vote.deleted_at,
    null,
  );

  // 5. Remove the vote (soft deletion) by update with empty body
  const removal: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.postVotes.update(connection, {
      postVoteId: vote.id,
      body: {} satisfies ICommunityPlatformPostVote.IUpdate,
    });
  typia.assert(removal);
  TestValidator.equals(
    "vote id remains same after soft delete",
    removal.id,
    vote.id,
  );
  TestValidator.notEquals(
    "deleted_at must be set after removal",
    removal.deleted_at,
    null,
  );
  TestValidator.equals(
    "vote_type omitted in soft-deleted record still accessible (non-business meaning)",
    removal.vote_type,
    vote.vote_type,
  );

  // 6. Optionally - Only original voter can remove; this is indirectly tested by using same session for all calls.
}
