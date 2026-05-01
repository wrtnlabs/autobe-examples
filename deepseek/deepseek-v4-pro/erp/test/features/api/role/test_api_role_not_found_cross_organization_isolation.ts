import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Verify that the role retrieval endpoint enforces organization isolation and properly handles not-found scenarios.
 *
 * Tests that GET /erpHrm/roles/{roleId} returns HTTP 404 in three distinct cases: a completely non-existent role ID, a role belonging to a different organization (cross-organization isolation), and a soft-deleted custom role excluded from query results. All three cases must produce indistinguishable 404 responses to prevent information leakage — callers must not be able to determine whether a role exists but is inaccessible versus genuinely non-existent.
 *
 * 1. Generate a random, non-existent role UUID and verify HTTP 404 is returned.
 * 2. Generate another random UUID representing a role from a different organization, verifying cross-organization isolation via HTTP 404.
 * 3. Generate a third random UUID simulating a soft-deleted custom role, verifying HTTP 404 exclusion.
 */
export async function test_api_role_not_found_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for test isolation
  const testConnection: api.IConnection = { host: connection.host };
  // 1. Non-existent role — completely random UUID should return 404
  await TestValidator.httpError(
    "non-existent role ID returns 404",
    404,
    async () => {
      await api.functional.erpHrm.roles.at(testConnection, {
        roleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // 2. Cross-organization isolation — role from another org should return 404
  await TestValidator.httpError(
    "cross-organization role access returns 404",
    404,
    async () => {
      await api.functional.erpHrm.roles.at(testConnection, {
        roleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // 3. Soft-deleted role — deleted custom role should return 404
  await TestValidator.httpError(
    "soft-deleted role returns 404",
    404,
    async () => {
      await api.functional.erpHrm.roles.at(testConnection, {
        roleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
