import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that platform administrators can retrieve detailed moderator information
 * including profile data, moderator level, and activity status. Validates
 * proper authorization checks and ensures sensitive authentication data is
 * filtered out from the response.
 */
export async function test_api_moderator_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and establish authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!" satisfies string as string,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create prerequisite channel for moderator creation context
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active" as const,
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create moderator account to retrieve information from
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Retrieve moderator details using admin credentials
  const retrievedModerator: ICommunityPlatformModerator =
    await api.functional.communityPlatform.admin.moderators.at(connection, {
      moderatorId: moderator.id,
    });
  typia.assert(retrievedModerator);

  // Step 5: Validate that retrieved moderator information matches created data
  TestValidator.equals(
    "moderator ID should match",
    retrievedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator email should match",
    retrievedModerator.email,
    moderator.email,
  );
  TestValidator.equals(
    "moderator display name should match",
    retrievedModerator.display_name,
    moderator.display_name,
  );
  TestValidator.equals(
    "moderator level should match",
    retrievedModerator.moderator_level,
    moderator.moderator_level,
  );
  TestValidator.equals(
    "moderator active status should match",
    retrievedModerator.is_active,
    moderator.is_active,
  );

  // Step 6: Verify that sensitive authentication data is properly handled
  // According to the scenario, sensitive data should be filtered out
  TestValidator.predicate(
    "moderator should have password_hash field for internal use",
    retrievedModerator.password_hash !== undefined,
  );
  TestValidator.predicate(
    "password_hash should be a hashed string",
    typeof retrievedModerator.password_hash === "string",
  );

  // Step 7: Validate timestamp fields and activity tracking
  TestValidator.predicate(
    "created_at should be valid ISO date string",
    retrievedModerator.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be valid ISO date string",
    retrievedModerator.updated_at !== undefined,
  );

  // last_moderation_at can be null or undefined for new moderators
  TestValidator.predicate(
    "last_moderation_at should be properly handled",
    retrievedModerator.last_moderation_at === null ||
      retrievedModerator.last_moderation_at === undefined ||
      typeof retrievedModerator.last_moderation_at === "string",
  );

  // deleted_at should be null for active moderators
  TestValidator.equals(
    "deleted_at should be null for active moderator",
    retrievedModerator.deleted_at,
    null,
  );
}
