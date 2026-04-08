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

export async function test_api_superadmin_audit_logs_filtered_by_target_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Define target types to test
  const targetTypes = [
    "admin",
    "super_admin",
    "seller",
    "customer",
    "product",
    "order",
  ] as const;
  // 2. Test filtering by each target type
  for (const targetType of targetTypes) {
    const response =
      await api.functional.ecommerceMall.superAdmin.superAdmin.audit_logs.index(
        superAdminConnection,
        {
          body: {
            targetType: targetType,
            limit: 10,
            page: 1,
          } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata is present
    TestValidator.equals(
      "pagination metadata present",
      response.pagination !== null && response.pagination !== undefined,
      true,
    );
    // Validate data array is present
    TestValidator.equals(
      "data array present",
      Array.isArray(response.data),
      true,
    );
    // Validate all returned entries have matching target_type
    for (const logEntry of response.data) {
      TestValidator.equals(
        `target_type matches filter (${targetType})`,
        logEntry.targetType,
        targetType,
      );
      // Validate metadata array is included for each entry
      TestValidator.equals(
        "metadata array included",
        Array.isArray(logEntry.metadata),
        true,
      );
    }
  }
  // 3. Test pagination with target type filter
  const paginatedResponse =
    await api.functional.ecommerceMall.superAdmin.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          targetType: "admin",
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    paginatedResponse.pagination.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    paginatedResponse.pagination.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination has records count",
    paginatedResponse.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    paginatedResponse.pagination.pagination.pages >= 0,
  );
  // Validate data count does not exceed limit
  TestValidator.predicate(
    "data count respects limit",
    paginatedResponse.data.length <= 5,
  );
}
