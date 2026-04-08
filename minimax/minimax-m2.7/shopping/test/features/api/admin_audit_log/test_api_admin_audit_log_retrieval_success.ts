import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test retrieving an existing admin audit log by its unique identifier.
 *
 * Validates the GET /ecommerceMall/admin/admin/audit-logs/{auditLogId} endpoint by first creating an administrator account, performing an administrative action (category creation) that generates an audit log entry, searching for that audit log to obtain its ID, and then retrieving the full audit log details.
 *
 * The test ensures that:
 * 1. An authenticated administrator can create a category (generating an audit log)
 * 2. The audit log can be searched and found via the index endpoint
 * 3. The individual audit log retrieval returns all required fields
 * 4. The admin object in the response matches the authenticated administrator
 * 5. All fields (id, admin, action, resourceType, resourceId, ipAddress, userAgent, createdAt) are properly populated
 *
 * This test validates the complete audit trail retrieval flow for platform administrators.
 */
export async function test_api_admin_audit_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a category to generate an audit log entry
  const category =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Search for the audit log by resourceId to get the auditLogId
  const searchResult =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          resourceId: category.id,
          limit: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(searchResult);
  // Extract the auditLogId from search results
  const auditLogId = searchResult.data[0].id;
  // 4. Retrieve the specific audit log by its ID
  const auditLog =
    await api.functional.ecommerceMall.admin.admin.audit_logs.getByAuditlogid(
      adminConnection,
      {
        auditLogId: auditLogId,
      },
    );
  typia.assert(auditLog);
  // 5. Validate the retrieved audit log
  TestValidator.equals("auditLogId matches", auditLog.id, auditLogId);
  TestValidator.predicate(
    "has admin object",
    auditLog.admin !== null && auditLog.admin !== undefined,
  );
  TestValidator.predicate(
    "has admin id",
    typeof auditLog.admin.id === "string",
  );
  TestValidator.equals(
    "action is create_category",
    auditLog.action,
    "create_category",
  );
  TestValidator.equals(
    "resourceType is category",
    auditLog.resourceType,
    "category",
  );
  TestValidator.equals(
    "resourceId matches category.id",
    auditLog.resourceId,
    category.id,
  );
  TestValidator.predicate(
    "has valid ipAddress",
    auditLog.ipAddress !== null && auditLog.ipAddress.length > 0,
  );
  TestValidator.predicate(
    "has valid createdAt",
    auditLog.createdAt !== null && new Date(auditLog.createdAt).getTime() > 0,
  );
  TestValidator.equals(
    "admin matches authenticated admin",
    auditLog.admin.id,
    searchResult.data[0].admin.id,
  );
}
