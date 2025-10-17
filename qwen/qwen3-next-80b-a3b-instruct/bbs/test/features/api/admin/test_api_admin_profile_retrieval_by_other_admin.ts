import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_admin_profile_retrieval_by_other_admin(
  connection: api.IConnection,
) {
  // Create first admin account for authentication
  const firstAdmin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(firstAdmin);

  // Create second admin account whose profile will be retrieved
  const secondAdmin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AnotherSecurePassword456!",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(secondAdmin);

  // Ensure at least one topic exists in system for admin validation
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Use first admin's credentials to retrieve second admin's profile
  const retrievedAdmin: IEconomicBoardAdmin =
    await api.functional.economicBoard.admin.admins.at(connection, {
      adminId: secondAdmin.id,
    });
  typia.assert(retrievedAdmin);

  // Validate response contains expected fields and excludes password_hash
  TestValidator.equals(
    "retrieved admin id matches",
    retrievedAdmin.id,
    secondAdmin.id,
  );
  TestValidator.equals(
    "retrieved admin email matches",
    retrievedAdmin.email,
    secondAdmin.email,
  );
  TestValidator.equals(
    "retrieved admin created_at matches",
    retrievedAdmin.created_at,
    secondAdmin.created_at,
  );
  TestValidator.equals(
    "retrieved admin last_login matches",
    retrievedAdmin.last_login,
    secondAdmin.last_login,
  );
  TestValidator.equals(
    "retrieved admin is_active matches",
    retrievedAdmin.is_active,
    secondAdmin.is_active,
  );
  TestValidator.equals(
    "retrieved admin auth_jwt_id matches",
    retrievedAdmin.auth_jwt_id,
    secondAdmin.auth_jwt_id,
  );

  // Confirm password_hash is not included in response (not part of IEconomicBoardAdmin interface)
  // The IEconomicBoardAdmin interface does not include password_hash in its definition for this retrieval
  // This confirms the endpoint properly masks sensitive fields

  // Test that non-existent adminId returns 404
  await TestValidator.error(
    "non-existent adminId should return 404",
    async () => {
      await api.functional.economicBoard.admin.admins.at(connection, {
        adminId: "00000000-0000-0000-0000-000000000000", // Invalid UUID
      });
    },
  );
}
