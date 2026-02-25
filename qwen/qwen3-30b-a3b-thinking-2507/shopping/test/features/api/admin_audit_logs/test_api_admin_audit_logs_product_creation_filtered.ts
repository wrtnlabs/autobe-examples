import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminAuditLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_audit_logs_product_creation_filtered(connection: api.IConnection): Promise<void> {
    // 1. Create admin account
    const adminConnection: api.IConnection = { host: connection.host };
    const { email, password } = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
    };
    const adminAuthorized = await authorize_admin_join(adminConnection, {
        body: { email, password },
    });
    // 2. Retrieve audit logs for product creation within last 30 days
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const auditLogs = await api.functional.ecommerce.admin.audit_logs.index(adminConnection, {
        body: {
            action: "create",
            target_entity: "ecommerce_products",
            since,
        } satisfies IEcommerceAdminAuditLog.IRequest,
    });
    typia.assert(auditLogs);
    // 3. Verify required fields in audit logs
    for (const log of auditLogs.data) {
        TestValidator.notEquals("log should have admin", log.admin, null);
        TestValidator.equals("log action should be create", log.action, "create");
        TestValidator.equals("log target entity should be ecommerce_products", log.target_entity, "ecommerce_products");
        TestValidator.predicate("log should have created_at timestamp", !!log.created_at);
        TestValidator.notEquals("log should have admin identity", log.admin.id, null);
        TestValidator.notEquals("log should have admin identity", log.admin.email, null);
    }
}