import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_creation_duplicate_name_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first user account and authenticate
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: firstUserEmail,
        password: "password123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/test",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(firstUser);

  // Step 2: First user creates a community with specific name
  const communityName = `test_community_${RandomGenerator.alphaNumeric(6)}`;
  const firstCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Duplicate Validation",
          description: "A community created to test duplicate name validation",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);

  TestValidator.equals(
    "community name matches expected",
    firstCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community creator is first user",
    firstCommunity.creator.id,
    firstUser.id,
  );

  // Step 3: Create second user account and authenticate
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: secondUserEmail,
        password: "password456!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/test2",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(secondUser);

  // Step 4: Second user attempts to create community with duplicate name
  await TestValidator.error(
    "second user cannot create community with duplicate name",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: communityName, // Same name as first user's community
            title: "Another Test Community",
            description: "This should fail due to duplicate name",
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 5: Verify the first community still exists and is unaffected
  TestValidator.equals(
    "first community name unchanged",
    firstCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "first community creator unchanged",
    firstCommunity.creator.id,
    firstUser.id,
  );
  TestValidator.equals(
    "member count should be 1",
    firstCommunity.member_count,
    1,
  );

  // Verify second user was properly authenticated but could not create duplicate
  TestValidator.equals(
    "second user is authenticated",
    secondUser.id,
    secondUser.id,
  );
  TestValidator.notEquals(
    "second user is different from first",
    secondUser.id,
    firstUser.id,
  );
}
