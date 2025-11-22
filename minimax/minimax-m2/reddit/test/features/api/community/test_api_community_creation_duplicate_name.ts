import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_creation_duplicate_name(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first user to establish original community
  const firstUserEmail: string = typia.random<string & tags.Format<"email">>();
  const firstUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: firstUserEmail,
        password: "password123",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(firstUser);

  // Step 2: Create first community with specific name
  const communityName: string =
    "test_community_" + RandomGenerator.alphabets(8);
  const firstCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Duplicate Testing",
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

  // Step 3: Create and authenticate second user
  const secondUserEmail: string = typia.random<string & tags.Format<"email">>();
  const secondUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: secondUserEmail,
        password: "password123",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(secondUser);

  // Step 4: Attempt to create community with duplicate name and verify error
  await TestValidator.error(
    "duplicate community name should fail",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: communityName, // Using the exact same name as first community
            title: "Duplicate Community Attempt",
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
}
