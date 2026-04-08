import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import type { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import type { IEcommerceMallSuperAdminAuditLogSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSuperAdminAuditLogSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLogSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_audit_logs_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator account using utility function
  const superAdminAuthorized = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdminAuthorized);
  // 2. Create authenticated connection with super admin token
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${superAdminAuthorized.token.access}`,
    },
  };
  // 3. Retrieve paginated audit logs with empty request body (default pagination)
  const auditLogsResponse =
    await api.functional.ecommerceMall.superAdmin.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsResponse);
  // 4. Validate pagination metadata structure
  // Note: pagination.pagination contains the actual pagination info (IPage.IPagination)
  TestValidator.predicate(
    "pagination current is at least 1",
    auditLogsResponse.pagination.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    auditLogsResponse.pagination.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    auditLogsResponse.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    auditLogsResponse.pagination.pagination.pages >= 0,
  );
  // 5. Validate data array structure
  TestValidator.predicate(
    "data is array",
    Array.isArray(auditLogsResponse.data),
  );
  // 6. If there are audit logs, validate entry structure
  if (auditLogsResponse.data.length > 0) {
    const firstEntry = auditLogsResponse.data[0];
    // Validate required fields exist
    TestValidator.predicate("entry has id", firstEntry.id !== undefined);
    TestValidator.predicate(
      "entry has action",
      firstEntry.action !== undefined,
    );
    TestValidator.predicate("entry has ip", firstEntry.ip !== undefined);
    TestValidator.predicate(
      "entry has userAgent",
      firstEntry.userAgent !== undefined,
    );
    TestValidator.predicate(
      "entry has createdAt",
      firstEntry.createdAt !== undefined,
    );
    TestValidator.predicate(
      "entry has superAdmin",
      firstEntry.superAdmin !== undefined,
    );
    TestValidator.predicate(
      "entry has metadata array",
      Array.isArray(firstEntry.metadata),
    );
    // Validate superAdmin summary structure
    TestValidator.predicate(
      "superAdmin has id",
      firstEntry.superAdmin.id !== undefined,
    );
    TestValidator.predicate(
      "superAdmin has email",
      firstEntry.superAdmin.email !== undefined,
    );
    TestValidator.predicate(
      "superAdmin has createdAt",
      firstEntry.superAdmin.createdAt !== undefined,
    );
    TestValidator.predicate(
      "superAdmin has updatedAt",
      firstEntry.superAdmin.updatedAt !== undefined,
    );
    // Validate metadata entries if present
    if (firstEntry.metadata.length > 0) {
      const firstMetadata = firstEntry.metadata[0];
      TestValidator.predicate(
        "metadata has id",
        firstMetadata.id !== undefined,
      );
      TestValidator.predicate(
        "metadata has key",
        firstMetadata.key !== undefined,
      );
      TestValidator.predicate(
        "metadata has value",
        firstMetadata.value !== undefined,
      );
    }
    // Validate sorting (newest first - createdAt should be descending)
    if (auditLogsResponse.data.length > 1) {
      const firstDate = new Date(auditLogsResponse.data[0].createdAt).getTime();
      const secondDate = new Date(
        auditLogsResponse.data[1].createdAt,
      ).getTime();
      TestValidator.predicate(
        "results sorted by createdAt descending",
        firstDate >= secondDate,
      );
    }
  }
}
