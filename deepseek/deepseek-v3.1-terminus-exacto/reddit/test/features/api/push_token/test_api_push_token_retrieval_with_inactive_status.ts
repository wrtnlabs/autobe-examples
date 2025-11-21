import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPushToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPushToken";

/**
 * Test push token retrieval for tokens with different status values (active,
 * expired, invalid). This scenario validates that administrators can retrieve
 * tokens regardless of their operational status and that status information is
 * accurately reported. The test verifies that status-specific details like
 * expiration timestamps and last usage information are properly included in the
 * response, supporting administrative oversight of token lifecycle management
 * and troubleshooting of notification delivery issues.
 */
export async function test_api_push_token_retrieval_with_inactive_status(
  connection: api.IConnection,
) {
  // Step 1: Create member account for token registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Register multiple push tokens with different status values
  const tokenStatuses = ["active", "expired", "invalid"] as const;

  const createdTokens = await ArrayUtil.asyncRepeat(
    tokenStatuses.length,
    async (index) => {
      const status = tokenStatuses[index];
      const pushToken =
        await api.functional.communityPlatform.member.pushTokens.create(
          connection,
          {
            body: {
              platform: "ios",
              device_token: RandomGenerator.alphaNumeric(64),
              device_model: "iPhone14,1",
              app_version: "1.0.0",
              token_status: status,
              expires_at:
                status === "expired"
                  ? new Date(Date.now() - 86400000).toISOString()
                  : new Date(Date.now() + 86400000).toISOString(),
            } satisfies ICommunityPlatformPushToken.ICreate,
          },
        );
      typia.assert(pushToken);
      return pushToken;
    },
  );

  // Step 3: Create administrator account for token retrieval
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Authenticate as administrator
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: RandomGenerator.alphaNumeric(32),
      user_agent: "TestAgent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Retrieve each token and validate status-specific information
  for (const createdToken of createdTokens) {
    const retrievedToken =
      await api.functional.communityPlatform.admin.pushTokens.at(connection, {
        tokenId: createdToken.id,
      });
    typia.assert(retrievedToken);

    // Validate token ID matches
    TestValidator.equals(
      "retrieved token ID matches created token ID",
      retrievedToken.id,
      createdToken.id,
    );

    // Validate platform information
    TestValidator.equals("platform matches", retrievedToken.platform, "ios");

    // Validate device token
    TestValidator.equals(
      "device token matches",
      retrievedToken.device_token,
      createdToken.device_token,
    );

    // Validate token status is preserved
    TestValidator.equals(
      "token status is preserved",
      retrievedToken.token_status,
      createdToken.token_status,
    );

    // Validate optional fields when present
    if (createdToken.device_model) {
      TestValidator.equals(
        "device model matches",
        retrievedToken.device_model,
        createdToken.device_model,
      );
    }

    if (createdToken.app_version) {
      TestValidator.equals(
        "app version matches",
        retrievedToken.app_version,
        createdToken.app_version,
      );
    }

    // Validate expiration timestamp for expired tokens
    if (createdToken.token_status === "expired") {
      TestValidator.predicate(
        "expired token has expiration timestamp",
        retrievedToken.expires_at !== undefined,
      );
    }

    // Validate creation timestamp exists
    TestValidator.predicate(
      "token has creation timestamp",
      retrievedToken.created_at !== undefined,
    );

    // Validate update timestamp exists
    TestValidator.predicate(
      "token has update timestamp",
      retrievedToken.updated_at !== undefined,
    );

    // Validate member association
    TestValidator.equals(
      "member ID association matches",
      retrievedToken.community_platform_member_id,
      member.id,
    );
  }

  // Step 6: Verify all tokens are accessible regardless of status
  TestValidator.equals(
    "all tokens were successfully retrieved",
    createdTokens.length,
    tokenStatuses.length,
  );
}
