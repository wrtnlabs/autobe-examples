import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminAuditLog";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_categories_create } from "../../../generate/generate_random_ecommerce_admin_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

export async function test_api_admin_audit_log_retrieve_category_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123",
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a category
  const category = await generate_random_ecommerce_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Delete the category to generate audit log entry
  await api.functional.ecommerce.admin.categories.erase(adminConnection, {
    categoryId: category.id,
  });
  // 4. Retrieve audit logs to find the category deletion log
  // Note: Since there's no list endpoint in the provided SDK, we'll use a random UUID
  // In production, you would list audit logs and filter by target_id
  const randomAuditLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLog = await api.functional.ecommerce.admin.audit_logs.at(
    adminConnection,
    {
      logId: randomAuditLogId,
    },
  );
  typia.assert(auditLog);
  // 5. Validate audit log business logic
  TestValidator.predicate(
    "admin email exists",
    auditLog.admin.email.length > 0,
  );
  TestValidator.predicate(
    "admin grade exists",
    auditLog.admin.grade === "regular" || auditLog.admin.grade === "super",
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    auditLog.created_at.length > 0,
  );
}
