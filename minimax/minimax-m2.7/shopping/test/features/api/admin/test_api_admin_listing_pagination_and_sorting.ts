import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
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

export async function test_api_admin_listing_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(superAdmin);
  // 2. Create multiple admin accounts to test pagination
  const adminCount = 8;
  for (let i = 0; i < adminCount; i++) {
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        name: `Test Admin ${i + 1}`,
        href: "https://example.com/register",
        referrer: "https://example.com",
      },
    });
    typia.assert(admin);
  }
  // 3. Test pagination: page=2, limit=5
  const paginatedResult =
    await api.functional.ecommerceMall.admin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 2",
    paginatedResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit should be 5",
    paginatedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "should have records",
    paginatedResult.pagination.records >= adminCount,
  );
  TestValidator.predicate(
    "should have multiple pages",
    paginatedResult.pagination.pages >= 2,
  );
  // 4. Test sorting by email ascending
  const sortedByEmailAsc =
    await api.functional.ecommerceMall.admin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          sortBy: "email",
          sort: "asc",
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(sortedByEmailAsc);
  // Validate email ordering is A-Z
  if (sortedByEmailAsc.data.length > 1) {
    for (let i = 0; i < sortedByEmailAsc.data.length - 1; i++) {
      const current = sortedByEmailAsc.data[i].email.toLowerCase();
      const next = sortedByEmailAsc.data[i + 1].email.toLowerCase();
      TestValidator.predicate(
        `email should be sorted ascending: ${current} <= ${next}`,
        current <= next,
      );
    }
  }
  // 5. Test sorting by email descending
  const sortedByEmailDesc =
    await api.functional.ecommerceMall.admin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          sortBy: "email",
          sort: "desc",
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(sortedByEmailDesc);
  // Validate email ordering is Z-A
  if (sortedByEmailDesc.data.length > 1) {
    for (let i = 0; i < sortedByEmailDesc.data.length - 1; i++) {
      const current = sortedByEmailDesc.data[i].email.toLowerCase();
      const next = sortedByEmailDesc.data[i + 1].email.toLowerCase();
      TestValidator.predicate(
        `email should be sorted descending: ${current} >= ${next}`,
        current >= next,
      );
    }
  }
  // 6. Test status filter: get only active admins
  const activeAdmins =
    await api.functional.ecommerceMall.admin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(activeAdmins);
  // Validate all returned admins have null or undefined deleted_at
  for (const admin of activeAdmins.data) {
    TestValidator.predicate(
      "admin should be active (deleted_at is null or undefined)",
      admin.deleted_at === null || admin.deleted_at === undefined,
    );
  }
  // 7. Test status filter: get only deleted admins
  const deletedAdmins =
    await api.functional.ecommerceMall.admin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "deleted",
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(deletedAdmins);
  // Validate all returned admins have non-null deleted_at
  for (const admin of deletedAdmins.data) {
    TestValidator.predicate(
      "admin should be deleted (deleted_at is not null)",
      admin.deleted_at !== null && admin.deleted_at !== undefined,
    );
  }
  // 8. Test sorting by name ascending
  const sortedByNameAsc =
    await api.functional.ecommerceMall.admin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          sortBy: "name",
          sort: "asc",
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(sortedByNameAsc);
  // 9. Test sorting by created_at descending
  const sortedByCreatedDesc =
    await api.functional.ecommerceMall.admin.admin.admins.index(
      superAdminConnection,
      {
        body: {
          sortBy: "created_at",
          sort: "desc",
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);
  // Validate created_at ordering is descending (newest first)
  if (sortedByCreatedDesc.data.length > 1) {
    for (let i = 0; i < sortedByCreatedDesc.data.length - 1; i++) {
      const current = new Date(
        sortedByCreatedDesc.data[i].created_at,
      ).getTime();
      const next = new Date(
        sortedByCreatedDesc.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "created_at should be sorted descending (newest first)",
        current >= next,
      );
    }
  }
}