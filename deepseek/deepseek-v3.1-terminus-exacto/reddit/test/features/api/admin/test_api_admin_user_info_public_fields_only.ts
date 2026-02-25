import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_user_info_public_fields_only(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a test user profile with complete data
  // Note: In a real scenario, we would need a user creation endpoint
  // For this test, we'll use a known username that exists in the system
  const testUsername = "existing_user";
  // Retrieve user profile using admin connection
  const userProfile = await api.functional.communityPlatform.admin.at(
    adminConnection,
    {
      username: testUsername,
    },
  );
  typia.assert(userProfile);
  // The typia.assert() call above validates:
  // - All required properties exist and have correct types
  // - All format validations (UUID, date-time, etc.)
  // - All constraint validations
  // Validate that the response contains only public-safe fields
  // by ensuring it matches the ICommunityPlatformUser interface exactly
  TestValidator.equals(
    "response matches public user DTO",
    Object.keys(userProfile).sort(),
    [
      "id",
      "username",
      "display_name",
      "bio",
      "avatar_url",
      "karma",
      "created_at",
      "updated_at",
      "deleted_at",
    ].sort(),
  );
  // Validate business logic: karma should be an integer
  TestValidator.predicate(
    "karma is integer",
    Number.isInteger(userProfile.karma),
  );
  // Validate that deleted_at follows the expected pattern (null or date-time)
  if (userProfile.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is valid date-time format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        userProfile.deleted_at,
      ),
    );
  }
}
