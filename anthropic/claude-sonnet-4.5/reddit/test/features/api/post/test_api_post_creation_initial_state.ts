import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test that newly created posts have correct initial state.
 *
 * This test validates that when a member creates a new post in a community, all
 * system-managed fields are properly initialized to their correct default
 * values. This includes:
 *
 * - Edited flag set to false (post not yet modified)
 * - Created_at timestamp set to current time
 * - Updated_at set to null (no edits have occurred)
 * - Deleted_at set to null (post is active, not soft-deleted)
 * - Post is immediately visible and accessible
 *
 * The test ensures proper initialization of post lifecycle tracking fields and
 * validates that the backend correctly manages post state metadata.
 *
 * Test Flow:
 *
 * 1. Create moderator account for community creation
 * 2. Create a community as the moderator
 * 3. Create member account for post creation
 * 4. Create a new post as the member
 * 5. Validate all initial state fields are correctly set
 */
export async function test_api_post_creation_initial_state(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community as moderator
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">
          >(),
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a new post as member
  const postTypes = ["text", "link", "image"] as const;
  const selectedPostType = RandomGenerator.pick(postTypes);

  const beforeCreation = new Date();

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        post_type: selectedPostType,
        body:
          selectedPostType === "text"
            ? RandomGenerator.content({ paragraphs: 2 })
            : null,
        url:
          selectedPostType === "link"
            ? typia.random<string & tags.MaxLength<2000> & tags.Format<"uri">>()
            : null,
        image_url:
          selectedPostType === "image"
            ? typia.random<string & tags.Format<"uri">>()
            : null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  const afterCreation = new Date();

  // Step 5: Validate initial state fields
  TestValidator.predicate(
    "edited flag should be false for newly created post",
    post.edited === false,
  );

  TestValidator.predicate(
    "created_at should be set to current timestamp",
    () => {
      const createdAt = new Date(post.created_at);
      return createdAt >= beforeCreation && createdAt <= afterCreation;
    },
  );

  TestValidator.equals(
    "updated_at should be null for newly created post",
    post.updated_at,
    null,
  );

  TestValidator.equals(
    "deleted_at should be null for active post",
    post.deleted_at,
    null,
  );

  TestValidator.predicate(
    "post should have valid UUID identifier",
    post.id !== null && post.id !== undefined && typeof post.id === "string",
  );

  TestValidator.equals(
    "post should be associated with correct community",
    post.community_id,
    community.id,
  );

  TestValidator.equals(
    "post should be associated with correct member",
    post.member_id,
    member.id,
  );
}
