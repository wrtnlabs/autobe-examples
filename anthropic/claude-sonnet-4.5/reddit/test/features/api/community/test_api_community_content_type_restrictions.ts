import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test updating community content type restrictions to control allowed post
 * types in a Reddit-like community system.
 *
 * This test validates the community content type restriction functionality by:
 *
 * 1. Creating and authenticating a member account who will create and manage a
 *    community
 * 2. Creating a new community with all post types initially enabled (text, link,
 *    and image posts)
 * 3. Updating the community settings to disable link posts and image posts,
 *    allowing only text posts
 * 4. Verifying that the content type toggles are correctly updated in the
 *    community configuration
 * 5. Testing re-enabling of disabled post types (link and image posts)
 * 6. Confirming that the re-enabled content types are properly reflected in the
 *    community settings
 *
 * The test follows a complete workflow from member registration through
 * community creation to multiple configuration updates, ensuring that
 * moderators can dynamically control what types of content are allowed in their
 * communities.
 */
export async function test_api_community_content_type_restrictions(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member who will create and manage the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a new community with all post types enabled by default
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Verify initial state - all post types should be enabled
  TestValidator.equals(
    "initial text posts allowed",
    community.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "initial link posts allowed",
    community.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "initial image posts allowed",
    community.allow_image_posts,
    true,
  );

  // Step 3: Update community to disable link and image posts, allowing only text posts
  const updatedCommunity =
    await api.functional.redditLike.moderator.communities.update(connection, {
      communityId: community.id,
      body: {
        allow_text_posts: true,
        allow_link_posts: false,
        allow_image_posts: false,
      } satisfies IRedditLikeCommunity.IUpdate,
    });
  typia.assert(updatedCommunity);

  // Step 4: Verify content type restrictions are correctly applied
  TestValidator.equals(
    "text posts still allowed",
    updatedCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts disabled",
    updatedCommunity.allow_link_posts,
    false,
  );
  TestValidator.equals(
    "image posts disabled",
    updatedCommunity.allow_image_posts,
    false,
  );

  // Step 5: Re-enable link and image posts
  const reenabledCommunity =
    await api.functional.redditLike.moderator.communities.update(connection, {
      communityId: community.id,
      body: {
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.IUpdate,
    });
  typia.assert(reenabledCommunity);

  // Step 6: Verify all content types are re-enabled
  TestValidator.equals(
    "text posts remain allowed",
    reenabledCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts re-enabled",
    reenabledCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "image posts re-enabled",
    reenabledCommunity.allow_image_posts,
    true,
  );
}
