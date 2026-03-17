import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_audit_log_retrieval_success_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create regular administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Step 3: Seller submits registration application
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // Step 4: Admin approves seller registration to generate audit log
  const registrationId = (registration as IEntity).id;
  const approved =
    await api.functional.ecommerceMall.admin.seller_registrations.update(
      adminConnection,
      {
        registrationId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(approved);
  // Step 5: Query audit logs to obtain the generated log ID
  const auditLogs = await api.functional.ecommerceMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(auditLogs);
  TestValidator.predicate("audit logs contain data", auditLogs.data.length > 0);
  const auditLogSummary = auditLogs.data[0];
  typia.assert(auditLogSummary);
  // Step 6: Retrieve specific audit log by ID
  const auditLog = await api.functional.ecommerceMall.admin.audit_logs.at(
    adminConnection,
    {
      logId: auditLogSummary.id,
    },
  );
  typia.assert(auditLog);
  // Step 7: Verify response contains all required fields
  TestValidator.equals("audit log id matches", auditLog.id, auditLogSummary.id);
  TestValidator.equals(
    "action matches",
    auditLog.action,
    auditLogSummary.action,
  );
  TestValidator.equals(
    "resourceType matches",
    auditLog.resourceType,
    auditLogSummary.resourceType,
  );
  TestValidator.equals(
    "resourceId matches",
    auditLog.resourceId,
    auditLogSummary.resourceId,
  );
  TestValidator.equals(
    "admin id matches",
    auditLog.admin.id,
    auditLogSummary.admin.id,
  );
  TestValidator.equals(
    "admin email matches",
    auditLog.admin.email,
    auditLogSummary.admin.email,
  );
  TestValidator.predicate("createdAt is valid", auditLog.createdAt !== null);
  TestValidator.predicate(
    "details field exists",
    auditLog.details !== undefined,
  );
  TestValidator.predicate("ip field exists", auditLog.ip !== undefined);
  TestValidator.predicate(
    "userAgent field exists",
    auditLog.userAgent !== undefined,
  );
}
