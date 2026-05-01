import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Verify retrieval of a specific audit log entry after category creation.
 *
 * Tests the append-only immutable audit log system by creating a category as an
 * administrator, then locating the corresponding audit log entry through the
 * browse endpoint and finally retrieving it by UUID for full detail validation.
 *
 * The audit log captures privileged administrative actions with before-and-after
 * state values. For creation operations, the old_value is null since there is no
 * prior state. The new_value records the created entity's name, and reason is
 * null since creation does not require justification.
 *
 * 1. Administrator joins and obtains authentication credentials.
 * 2. Administrator creates a new top-level category.
 * 3. Browse audit logs filtered by "create_category" action type.
 * 4. Locate the entry matching the created category's UUID.
 * 5. Retrieve the full audit log entry by its ID.
 * 6. Validate all business fields including action type, target entity, state
 *    values, admin reference, and timestamp.
 */
export async function test_api_audit_log_retrieve_after_category_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create a category to trigger audit log entry
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Browse audit logs filtered by create_category action type
  const auditPage = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        action_type: "create_category",
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(auditPage);
  // 4. Locate the entry for the created category
  const auditEntry = auditPage.data.find(
    (entry) => entry.target_entity_id === category.id,
  );
  typia.assert(auditEntry!);
  // 5. Retrieve full audit log entry by ID
  const auditLog = await api.functional.shoppingMall.admin.audit_logs.at(
    adminConnection,
    {
      logId: auditEntry!.id,
    },
  );
  typia.assert(auditLog);
  // 6. Validate business fields
  TestValidator.equals("action_type", auditLog.action_type, "create_category");
  TestValidator.equals(
    "target_entity_type",
    auditLog.target_entity_type,
    "category",
  );
  TestValidator.equals(
    "target_entity_id",
    auditLog.target_entity_id,
    category.id,
  );
  TestValidator.equals(
    "old_value is null for creation",
    auditLog.old_value,
    null,
  );
  TestValidator.equals(
    "new_value is category name",
    auditLog.new_value,
    category.name,
  );
  TestValidator.equals("reason is null for creation", auditLog.reason, null);
  TestValidator.equals("admin id matches", auditLog.admin.id, admin.id);
  TestValidator.equals(
    "admin email matches",
    auditLog.admin.email,
    admin.email,
  );
  TestValidator.equals(
    "admin grade matches",
    auditLog.admin.grade,
    admin.grade,
  );
}
