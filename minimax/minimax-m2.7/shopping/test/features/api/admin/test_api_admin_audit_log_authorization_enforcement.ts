import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_audit_log_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for the audit log ID
  const validAuditLogId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Guest access without any authentication
  // Expect 401 Unauthorized since no token is provided
  await TestValidator.httpError(
    "guest cannot access audit logs",
    401,
    async () => {
      await api.functional.ecommerceMall.admin.admin.audit_logs.at(connection, {
        auditLogId: validAuditLogId,
      });
    },
  );
  // Test 2: Customer authentication - non-admin user
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Expect 401 or 403 since customers cannot access admin audit logs
  await TestValidator.httpError(
    "customer cannot access audit logs",
    [401, 403],
    async () => {
      await api.functional.ecommerceMall.admin.admin.audit_logs.at(
        customerConnection,
        {
          auditLogId: validAuditLogId,
        },
      );
    },
  );
  // Test 3: Seller authentication - non-admin user
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Expect 401 or 403 since sellers cannot access admin audit logs
  await TestValidator.httpError(
    "seller cannot access audit logs",
    [401, 403],
    async () => {
      await api.functional.ecommerceMall.admin.admin.audit_logs.at(
        sellerConnection,
        {
          auditLogId: validAuditLogId,
        },
      );
    },
  );
}
