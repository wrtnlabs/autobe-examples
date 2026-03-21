import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin via POST /erpHrm/auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Send PATCH request to /erpHrm/admin/admin-audit-logs with empty body for default pagination
  const response = await api.functional.erpHrm.admin.admin_audit_logs.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmAdminAuditLog.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination object with default values
  TestValidator.equals(
    "pagination current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20 (default)",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array structure (if not empty)
  if (response.data.length > 0) {
    const firstEntry = response.data[0];
    TestValidator.predicate(
      "entry has valid id (UUID)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstEntry.id,
      ),
    );
    TestValidator.predicate(
      "entry has actionType",
      firstEntry.actionType.length > 0,
    );
    TestValidator.predicate(
      "entry has targetEntity",
      firstEntry.targetEntity.length > 0,
    );
    TestValidator.predicate(
      "entry has valid targetId (UUID)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstEntry.targetId,
      ),
    );
    TestValidator.predicate(
      "entry has valid createdAt (ISO date-time)",
      !isNaN(Date.parse(firstEntry.createdAt)),
    );
    // Validate admin summary structure
    TestValidator.predicate(
      "entry has admin summary",
      firstEntry.admin !== undefined,
    );
    TestValidator.predicate(
      "admin has valid id (UUID)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstEntry.admin.id,
      ),
    );
    TestValidator.predicate(
      "admin has email",
      firstEntry.admin.email.length > 0,
    );
    TestValidator.predicate(
      "admin has display_name",
      firstEntry.admin.display_name.length > 0,
    );
    // 5. Validate sorting - entries should be sorted by created_at descending (newest first)
    for (let i = 1; i < response.data.length; i++) {
      const prev = new Date(response.data[i - 1].createdAt);
      const curr = new Date(response.data[i].createdAt);
      TestValidator.predicate(
        `entry at index ${i} should have createdAt <= entry at index ${i - 1}`,
        curr.getTime() <= prev.getTime(),
      );
    }
  }
}
