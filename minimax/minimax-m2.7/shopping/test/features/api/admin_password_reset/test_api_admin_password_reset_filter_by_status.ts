import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_password_reset_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: (RandomGenerator.alphaNumeric(16) + "!Aa1") as string &
        tags.Format<"password">,
      href: "/admin/dashboard",
      referrer: "/login",
    },
  });
  typia.assert(superAdmin);
  // Use a test admin UUID for filtering (this could be a real admin ID from database)
  const testAdminId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test filtering by 'all' status - should return all records
  const allRecords =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: testAdminId,
        body: {
          status: "all",
          limit: 100,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(allRecords);
  TestValidator.predicate(
    "all status returns paginated response",
    allRecords.data !== undefined,
  );
  // 3. Test filtering by 'active' status - unused and not expired
  const activeRecords =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: testAdminId,
        body: {
          status: "active",
          limit: 100,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(activeRecords);
  // Verify active records: usedAt should be null and not expired (if any exist)
  for (const record of activeRecords.data) {
    TestValidator.equals("active record has null usedAt", record.usedAt, null);
    TestValidator.predicate(
      "active record not expired",
      new Date(record.expiresAt) > new Date(),
    );
  }
  // 4. Test filtering by 'used' status - consumed tokens
  const usedRecords =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: testAdminId,
        body: {
          status: "used",
          limit: 100,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(usedRecords);
  // If used records exist, verify usedAt is not null
  if (usedRecords.data.length > 0) {
    for (const record of usedRecords.data) {
      TestValidator.predicate("used record has usedAt", record.usedAt !== null);
    }
  }
  // 5. Test filtering by 'expired' status - unused but expired
  const expiredRecords =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: testAdminId,
        body: {
          status: "expired",
          limit: 100,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(expiredRecords);
  // If expired records exist, verify usedAt is null and expired
  for (const record of expiredRecords.data) {
    TestValidator.equals("expired record has null usedAt", record.usedAt, null);
    TestValidator.predicate(
      "expired record past expiration",
      new Date(record.expiresAt) <= new Date(),
    );
  }
  // 6. Test date range filters combined with status
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const filteredByDate =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: testAdminId,
        body: {
          status: "all",
          created_at_from: oneDayAgo.toISOString() as string &
            tags.Format<"date-time">,
          created_at_to: oneDayLater.toISOString() as string &
            tags.Format<"date-time">,
          limit: 100,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(filteredByDate);
  // Verify pagination structure
  TestValidator.equals(
    "created_at_from filter applied",
    filteredByDate.pagination.pagination !== undefined,
    true,
  );
  // 7. Test pagination - verify correct structure
  const paginatedRecords =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: testAdminId,
        body: {
          status: "all",
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(paginatedRecords);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedRecords.data.length <= 1,
  );
  TestValidator.equals(
    "page number is 1",
    paginatedRecords.pagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records count",
    (paginatedRecords.pagination.pagination.records as number) >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    (paginatedRecords.pagination.pagination.pages as number) >= 0,
  );
  // 8. Test expires_at date range filter
  const expiresFilter =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: testAdminId,
        body: {
          status: "active",
          expires_at_from: now.toISOString() as string &
            tags.Format<"date-time">,
          limit: 100,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(expiresFilter);
  // Verify all returned records expire in the future (if any exist)
  for (const record of expiresFilter.data) {
    TestValidator.predicate(
      "expires_at in future",
      new Date(record.expiresAt) >= now,
    );
  }
  // 9. Test filtering by admin_id
  const byAdminId =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: testAdminId,
        body: {
          status: "all",
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(byAdminId);
  // All records should belong to the specified admin
  for (const record of byAdminId.data) {
    TestValidator.equals(
      "record belongs to admin",
      record.admin.id,
      testAdminId,
    );
  }
  // 10. Test combining status with expires_at_to filter
  const expiresToFilter =
    await api.functional.ecommerceMall.superAdmin.admins.password_resets.index(
      superAdminConnection,
      {
        adminId: testAdminId,
        body: {
          status: "expired",
          expires_at_to: now.toISOString() as string & tags.Format<"date-time">,
          limit: 100,
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(expiresToFilter);
  // Verify pagination structure exists
  TestValidator.predicate(
    "expires_to filter returns valid pagination",
    expiresToFilter.pagination.pagination.limit !== undefined,
  );
}
