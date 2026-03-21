import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_admin_promotions_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_admin_promotions_create";
import { prepare_random_ecommerce_mall_admin_promotion } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion";

export async function test_api_admin_audit_log_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super administrator account using join endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SuperAdmin123!@#" as string & tags.Format<"password">,
        href: "https://admin.example.com/register",
        referrer: "https://admin.example.com",
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create a regular administrator account to be promoted
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!@#" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com",
    },
  });
  typia.assert(adminAuth);
  // 3. Super admin logs in to get fresh session with proper token
  const loggedInSuperAdminConnection: api.IConnection = {
    host: connection.host,
  };
  const loggedInSuperAdmin = await authorize_super_admin_login(
    loggedInSuperAdminConnection,
    {
      body: {
        email: superAdminAuth.email,
        password: "SuperAdmin123!@#" as string & tags.Format<"password">,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/register",
      },
    },
  );
  typia.assert(loggedInSuperAdmin);
  // 4. Super admin promotes the regular admin - this generates an audit log entry
  const promotion =
    await api.functional.ecommerceMall.superAdmin.admin_promotions.create(
      loggedInSuperAdminConnection,
      {
        body: {
          adminId: adminAuth.id,
          reason: "Test promotion for audit log verification",
        } satisfies IEcommerceMallAdminPromotion.ICreate,
      },
    );
  typia.assert(promotion);
  // 5. Super admin retrieves the audit log using the admin id
  const auditLog = await api.functional.ecommerceMall.admin.admin.audit_logs.at(
    loggedInSuperAdminConnection,
    {
      logId: adminAuth.id,
    },
  );
  typia.assert(auditLog);
  // 6. Verify all required fields in the audit log response
  TestValidator.equals(
    "audit log id matches admin id",
    auditLog.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "admin email matches promoter",
    auditLog.admin.email,
    superAdminAuth.email,
  );
  TestValidator.equals(
    "action type is promotion",
    auditLog.action,
    "promotion",
  );
  TestValidator.equals(
    "resource type is admin",
    auditLog.resource_type,
    "admin",
  );
  TestValidator.equals(
    "resource id matches target admin",
    auditLog.resource_id,
    adminAuth.id,
  );
  TestValidator.predicate("has ip address", auditLog.ip_address.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    auditLog.created_at.length > 0,
  );
}
