import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfigHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_config_history_admin_search_by_actor(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Search for existing config history records to validate actor filtration
  // First, search for any records with actor='system'
  const systemRecords =
    await api.functional.shoppingMall.admin.config.history.index(
      adminConnection,
      {
        body: {
          actor: "system",
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  typia.assert(systemRecords);
  // Second, search for any records with actor='admin'
  const adminRecords =
    await api.functional.shoppingMall.admin.config.history.index(
      adminConnection,
      {
        body: {
          actor: "admin",
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  typia.assert(adminRecords);
  // Step 3: Validate that we have records of both actor types
  TestValidator.predicate(
    "at least one system record exists",
    () => systemRecords.data.length > 0,
  );
  TestValidator.predicate(
    "at least one admin record exists",
    () => adminRecords.data.length > 0,
  );
  // Step 4: Perform actor-based search test
  // Search for records by actor='system'
  const systemOnlyResults =
    await api.functional.shoppingMall.admin.config.history.index(
      adminConnection,
      {
        body: {
          actor: "system",
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  typia.assert(systemOnlyResults);
  // Validate only system records returned
  TestValidator.equals(
    "system actor search returns only system records",
    systemOnlyResults.data.length > 0,
    true,
  );
  TestValidator.predicate("no admin records in system search", () =>
    systemOnlyResults.data.every((record) => {
      typia.assertGuard(record);
      return (record as any).actor === "system";
    }),
  );
  TestValidator.predicate("system records exist in results", () =>
    systemOnlyResults.data.some((record) => {
      typia.assertGuard(record);
      return (record as any).actor === "system";
    }),
  );
  TestValidator.predicate(
    "admin records not included",
    () => !systemOnlyResults.data.some((record) => {
      typia.assertGuard(record);
      return (record as any).actor === "admin";
    }),
  );
  // Search for records by actor='admin'
  const adminOnlyResults =
    await api.functional.shoppingMall.admin.config.history.index(
      adminConnection,
      {
        body: {
          actor: "admin",
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  typia.assert(adminOnlyResults);
  // Validate only admin records returned
  TestValidator.equals(
    "admin actor search returns only admin records",
    adminOnlyResults.data.length > 0,
    true,
  );
  TestValidator.predicate("no system records in admin search", () =>
    adminOnlyResults.data.every((record) => {
      typia.assertGuard(record);
      return (record as any).actor === "admin";
    }),
  );
  TestValidator.predicate("admin records exist in results", () =>
    adminOnlyResults.data.some((record) => {
      typia.assertGuard(record);
      return (record as any).actor === "admin";
    }),
  );
  TestValidator.predicate(
    "system records not included",
    () => !adminOnlyResults.data.some((record) => {
      typia.assertGuard(record);
      return (record as any).actor === "system";
    }),
  );
}