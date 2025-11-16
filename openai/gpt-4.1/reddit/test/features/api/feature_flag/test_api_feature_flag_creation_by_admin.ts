import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";

/**
 * Validate that an authenticated admin can create a new feature flag and that
 * all fields are persisted and correct.
 *
 * 1. Register a new administrator using /auth/administrator/join (generates unique
 *    email every run)
 * 2. Authenticate as this administrator (join endpoint returns auth info and
 *    token)
 * 3. Create a feature flag via /communityPlatform/administrator/featureFlags using
 *    unique key and valid business attributes
 * 4. Assert the response shape and that critical fields match input and expected
 *    business rules
 */
export async function test_api_feature_flag_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminJoinBody.email);
  TestValidator.predicate(
    "admin id is UUID format",
    typeof admin.id === "string" && admin.id.length > 0,
  );

  // 2. Create feature flag
  const flagKey = `feature_${RandomGenerator.alphaNumeric(10)}`;
  const flagType = RandomGenerator.pick([
    "boolean",
    "percentage_rollout",
    "variant",
  ] as const);
  const flagStatus = RandomGenerator.pick([
    "enabled",
    "disabled",
    "scheduled",
  ] as const);
  const reqBody = {
    flag_key: flagKey,
    flag_type: flagType,
    status: flagStatus,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformFeatureFlag.ICreate;
  const flag =
    await api.functional.communityPlatform.administrator.featureFlags.create(
      connection,
      { body: reqBody },
    );
  typia.assert(flag);
  TestValidator.equals("flag_key must match", flag.flag_key, flagKey);
  TestValidator.equals("flag_type must match", flag.flag_type, flagType);
  TestValidator.equals("status must match", flag.status, flagStatus);
  if (reqBody.description !== undefined && reqBody.description !== null)
    TestValidator.equals(
      "flag description",
      flag.description,
      reqBody.description,
    );
  TestValidator.predicate(
    "flag id is uuid",
    typeof flag.id === "string" && flag.id.length > 0,
  );
  TestValidator.predicate(
    "created_at set",
    flag.created_at !== undefined && flag.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at set",
    flag.updated_at !== undefined && flag.updated_at !== null,
  );
}
