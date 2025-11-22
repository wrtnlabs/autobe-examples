import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test private community access control - unauthenticated users should be
 * denied access.
 *
 * This test validates that private communities properly restrict access to
 * non-members. Steps: 1) Create authenticated user and private community for
 * setup, 2) Test main scenario by attempting to access private community
 * without authentication, 3) Verify access is denied with appropriate error
 * handling. Ensures private community security is enforced.
 */
export async function test_api_community_retrieval_private_community(
  connection: api.IConnection,
) {
  // Setup: Create authenticated user to establish private community
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: creatorEmail,
        password: RandomGenerator.alphaNumeric(16) + "A1!",
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(creator);

  // Setup: Create private community for testing access control
  const privateCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: "private_" + RandomGenerator.alphaNumeric(8),
          title: "Private Community for Testing",
          description: "A private community for access control testing",
          type: "private",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);

  // Main test: Attempt to access private community without authentication
  // Create unauthenticated connection by clearing authorization
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Verify access is denied for private community
  await TestValidator.error(
    "unauthenticated access to private community should be denied",
    async () => {
      await api.functional.redditPlatform.communities.at(
        unauthenticatedConnection,
        {
          communityName: privateCommunity.name,
        },
      );
    },
  );
}
