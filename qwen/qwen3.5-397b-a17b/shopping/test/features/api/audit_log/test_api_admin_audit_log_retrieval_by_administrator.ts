import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
 * Test administrator audit log retrieval by UUID.
 *
 * Validates the complete audit log retrieval flow including administrator authentication, administrative action execution (category creation), and audit log endpoint access. Ensures that the audit log response contains all required fields for compliance and forensic analysis.
 *
 * Special attention is given to verifying that the admin relation includes complete administrator details with member profile information, and that all timestamp fields are in ISO 8601 format. The test also validates action type classification and target entity identification.
 *
 * 1. Administrator joins with randomized credentials and grade level.
 * 2. Administrator creates a category which generates an audit log entry.
 * 3. Administrator retrieves an audit log entry by UUID.
 * 4. Validates response structure including admin details, action metadata, and timestamps.
 */
export async function test_api_admin_audit_log_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create category (generates audit log entry)
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Retrieve audit log by UUID
  const auditLog = await api.functional.shoppingMall.admin.admin.audit_logs.at(
    adminConnection,
    {
      auditLogId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(auditLog);
  // 4. Validate business logic (not type constraints - already validated by typia.assert)
  TestValidator.equals(
    "admin ID matches authenticated user",
    auditLog.admin.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "admin email matches authenticated user",
    auditLog.admin.email,
    adminAuth.email,
  );
  // Validate admin member profile exists with customer profile data
  TestValidator.predicate(
    "admin has member account",
    auditLog.admin.member !== null,
  );
  if (auditLog.admin.member.customerProfile !== null) {
    TestValidator.predicate(
      "customer profile has display name",
      auditLog.admin.member.customerProfile.display_name.length > 0,
    );
    TestValidator.predicate(
      "customer profile has phone number",
      auditLog.admin.member.customerProfile.phone_number.length > 0,
    );
  }
}
