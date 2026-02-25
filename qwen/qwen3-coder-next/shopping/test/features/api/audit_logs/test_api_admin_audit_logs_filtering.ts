import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" as string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Generate random filtering parameters
  const actorTypes = ["customer", "seller", "admin", "system"] as const;
  const operationTypes = [
    "create",
    "update",
    "delete",
    "login",
    "logout",
  ] as const;
  const entityTypes = [
    "customer",
    "seller",
    "product",
    "order",
    "review",
  ] as const;
  const filterParams: IShoppingMallSystemAuditLog.IRequest = {
    actor_type: RandomGenerator.pick(actorTypes),
    operation_type: RandomGenerator.pick(operationTypes),
    entity_type: RandomGenerator.pick(entityTypes),
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    created_at_gte: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_at_lte: new Date().toISOString(),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  // Call the audit logs filtering endpoint
  const result = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: filterParams,
    },
  );
  // Validate the result structure
  typia.assert(result);
  // Verify pagination
  TestValidator.equals(
    "pagination exists",
    result.pagination.current,
    filterParams.page,
  );
  TestValidator.equals(
    "pagination limit matches",
    result.pagination.limit,
    filterParams.limit,
  );
  TestValidator.predicate("has records", result.pagination.records >= 0);
  TestValidator.predicate(
    "pages calculated correctly",
    result.pagination.records === 0 || result.pagination.pages > 0,
  );
  // Verify data array structure
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  const limitValue = filterParams.limit ?? 20;
  TestValidator.equals(
    "data array length matches pagination limit",
    result.data.length <= limitValue,
    true,
  );
  // Validate audit log entries if any exist
  if (result.data.length > 0) {
    // Check that all entries match the filter criteria
    for (const entry of result.data) {
      if (filterParams.actor_type) {
        TestValidator.equals(
          "actor_type matches filter",
          entry.actor_type,
          filterParams.actor_type,
        );
      }
      if (filterParams.operation_type) {
        TestValidator.equals(
          "operation_type matches filter",
          entry.operation_type,
          filterParams.operation_type,
        );
      }
      if (filterParams.entity_type) {
        TestValidator.equals(
          "entity_type matches filter",
          entry.entity_type,
          filterParams.entity_type,
        );
      }
      if (filterParams.ip_address) {
        TestValidator.predicate(
          "ip_address matches filter",
          entry.ip_address === filterParams.ip_address,
        );
      }
    }
  }
}