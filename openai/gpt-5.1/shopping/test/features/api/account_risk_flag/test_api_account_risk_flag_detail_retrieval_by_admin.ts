import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that an authenticated admin can retrieve detailed information for a
 * specific account risk flag they have just created.
 *
 * Business flow:
 *
 * 1. Admin joins via /auth/admin/join and receives authorization context.
 * 2. Using that admin context, create a new risk flag via
 *    /shoppingMall/admin/accountRiskFlags (ICreate DTO).
 * 3. Retrieve the same risk flag via GET
 *    /shoppingMall/admin/accountRiskFlags/{riskFlagId}.
 * 4. Verify that the retrieved record matches the created record on all business
 *    fields and maintains a consistent view on system-managed fields such as id
 *    and timestamps.
 */
export async function test_api_account_risk_flag_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorized context (token handled by SDK)
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a new account risk flag as this admin
  const createBody = typia.random<IShoppingMallAccountRiskFlag.ICreate>();
  const createdFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallAccountRiskFlag>(createdFlag);

  // 3. Retrieve the same risk flag by its id
  const fetchedFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.at(connection, {
      riskFlagId: createdFlag.id,
    });
  typia.assert<IShoppingMallAccountRiskFlag>(fetchedFlag);

  // 4. Business validations

  // 4-1. Path parameter id must match fetched record id
  TestValidator.equals(
    "riskFlagId path parameter matches fetched record id",
    fetchedFlag.id,
    createdFlag.id,
  );

  // 4-2. Business fields from ICreate should be preserved
  TestValidator.equals(
    "actor_type is preserved between create and fetch",
    fetchedFlag.actor_type,
    createdFlag.actor_type,
  );
  TestValidator.equals(
    "code is preserved between create and fetch",
    fetchedFlag.code,
    createdFlag.code,
  );
  TestValidator.equals(
    "severity is preserved between create and fetch",
    fetchedFlag.severity,
    createdFlag.severity,
  );
  TestValidator.equals(
    "active flag is preserved between create and fetch",
    fetchedFlag.active,
    createdFlag.active,
  );
  TestValidator.equals(
    "reason (nullable) is preserved between create and fetch",
    fetchedFlag.reason ?? null,
    createdFlag.reason ?? null,
  );
  TestValidator.equals(
    "expires_at (nullable) is preserved between create and fetch",
    fetchedFlag.expires_at ?? null,
    createdFlag.expires_at ?? null,
  );

  // 4-3. System-managed fields: id should be identical and timestamps consistent
  TestValidator.equals(
    "created flag id matches fetched flag id",
    fetchedFlag.id,
    createdFlag.id,
  );

  // created_at must be the same snapshot
  TestValidator.equals(
    "created_at is identical between create and fetch",
    fetchedFlag.created_at,
    createdFlag.created_at,
  );

  // updated_at from fetch should be greater than or equal to created_at
  TestValidator.predicate("updated_at is not earlier than created_at", () => {
    const createdTime = new Date(createdFlag.created_at).getTime();
    const updatedTime = new Date(fetchedFlag.updated_at).getTime();
    return updatedTime >= createdTime;
  });

  // For a freshly created record, deleted_at should be null or undefined
  TestValidator.equals(
    "createdFlag.deleted_at is null for newly created flag",
    createdFlag.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "fetchedFlag.deleted_at is null for newly created flag",
    fetchedFlag.deleted_at ?? null,
    null,
  );
}
