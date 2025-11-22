import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";

/**
 * Test successful JWT token refresh for content moderator authentication flow.
 *
 * This test validates the complete token refresh workflow by creating a new
 * content moderator account, obtaining initial JWT tokens, then successfully
 * refreshing the access token using the valid refresh token. The test ensures
 * that session renewal works seamlessly while preserving moderator identity and
 * permissions.
 *
 * Key validation points include: verifying that refresh returns new access and
 * refresh tokens, confirming the moderator data remains consistent, ensuring
 * token timestamps are updated, and validating that the refresh token rotation
 * mechanism functions correctly. The test simulates real-world usage where
 * content moderators extend their session during content management activities
 * without requiring re-authentication.
 */
export async function test_api_moderator_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new content moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();

  const initialModerator: IEconPoliticalDiscussionContentModerator.IAuthorized =
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: moderatorEmail,
        password: "SecurePass123!",
        bio: "Content moderator for economic and political discussions",
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: "https://moderation-dashboard.example.com/join",
        referrer: "https://platform.example.com/register",
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });

  // Validate initial registration response
  typia.assert(initialModerator);
  TestValidator.equals(
    "moderator account created successfully",
    initialModerator.id.length > 0,
    true,
  );
  TestValidator.equals(
    "initial access token exists",
    initialModerator.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "initial refresh token exists",
    initialModerator.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "moderator status is active",
    initialModerator.status,
    "active",
  );
  TestValidator.equals(
    "email matches registration",
    initialModerator.email,
    moderatorEmail,
  );

  // Extract refresh token for the refresh test
  const refreshToken: string = initialModerator.token.refresh;

  // Step 2: Refresh the access token using the refresh token
  const refreshedModerator: IEconPoliticalDiscussionContentModerator.IAuthorized =
    await api.functional.auth.contentModerator.refresh.renewSession(
      connection,
      {
        body: {
          refreshToken: refreshToken,
        } satisfies IEconPoliticalDiscussionContentModerator.IRefresh,
      },
    );

  // Validate refresh response
  typia.assert(refreshedModerator);

  // Step 3: Verify successful token refresh
  TestValidator.equals(
    "moderator ID preserved",
    refreshedModerator.id,
    initialModerator.id,
  );
  TestValidator.equals(
    "display name preserved",
    refreshedModerator.display_name,
    initialModerator.display_name,
  );
  TestValidator.equals(
    "email preserved",
    refreshedModerator.email,
    initialModerator.email,
  );
  TestValidator.equals(
    "status remains active",
    refreshedModerator.status,
    initialModerator.status,
  );
  TestValidator.equals(
    "bio preserved",
    refreshedModerator.bio,
    initialModerator.bio,
  );
  TestValidator.equals(
    "avatar URL preserved",
    refreshedModerator.avatar_url,
    initialModerator.avatar_url,
  );

  // Verify token rotation (new tokens should be different)
  TestValidator.notEquals(
    "new access token is different",
    refreshedModerator.token.access,
    initialModerator.token.access,
  );
  TestValidator.notEquals(
    "new refresh token is different",
    refreshedModerator.token.refresh,
    initialModerator.token.refresh,
  );

  // Verify token timestamps are updated
  TestValidator.notEquals(
    "access token expiration updated",
    refreshedModerator.token.expired_at,
    initialModerator.token.expired_at,
  );
  TestValidator.notEquals(
    "refresh token expiration updated",
    refreshedModerator.token.refreshable_until,
    initialModerator.token.refreshable_until,
  );

  // Verify new tokens are valid (non-empty)
  TestValidator.equals(
    "new access token is non-empty",
    refreshedModerator.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "new refresh token is non-empty",
    refreshedModerator.token.refresh.length > 0,
    true,
  );

  // Verify new refresh token can be used for subsequent refreshes
  const secondRefreshModerator: IEconPoliticalDiscussionContentModerator.IAuthorized =
    await api.functional.auth.contentModerator.refresh.renewSession(
      connection,
      {
        body: {
          refreshToken: refreshedModerator.token.refresh,
        } satisfies IEconPoliticalDiscussionContentModerator.IRefresh,
      },
    );

  typia.assert(secondRefreshModerator);
  TestValidator.equals(
    "second refresh maintains moderator identity",
    secondRefreshModerator.id,
    refreshedModerator.id,
  );
  TestValidator.notEquals(
    "second refresh generates new tokens",
    secondRefreshModerator.token.access,
    refreshedModerator.token.access,
  );

  console.log("✅ Content moderator token refresh test completed successfully");
  console.log(`   Initial moderator ID: ${initialModerator.id}`);
  console.log(`   Final moderator ID: ${secondRefreshModerator.id}`);
  console.log(`   Token refresh performed: 2 times`);
}
