import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

/**
 * Test admin listing filter by status functionality.
 *
 * This test verifies that an administrator can filter the admin listing by status
 * to view active or soft-deleted administrator accounts.
 *
 * Test scenarios:
 * 1. Filter with status='active' returns only active admins (deleted_at IS NULL)
 * 2. Filter with status='deleted' returns only soft-deleted admins (deleted_at IS NOT NULL)
 * 3. When there are deleted admins, the response includes their deleted_at timestamps
 * 4. Pagination works correctly with status filter applied
 */
export async function test_api_admin_listing_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for listing admins
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test filtering with status='active' (default behavior)
  const activeAdminsResponse =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(activeAdminsResponse);
  // Validate pagination structure
  TestValidator.equals(
    "activeAdmins has pagination",
    activeAdminsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    activeAdminsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is valid",
    activeAdminsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records >= 1",
    activeAdminsResponse.pagination.records >= 1,
  );
  TestValidator.predicate("has data", activeAdminsResponse.data.length >= 1);
  // Validate active admins have null deleted_at
  for (const adminItem of activeAdminsResponse.data) {
    TestValidator.equals(
      "active admin has null deleted_at",
      adminItem.deleted_at,
      null,
    );
  }
  // 3. Test filtering with status='deleted'
  const deletedAdminsResponse =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        status: "deleted",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(deletedAdminsResponse);
  // Validate pagination structure for deleted filter
  TestValidator.equals(
    "deletedAdmins has pagination",
    deletedAdminsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    deletedAdminsResponse.pagination.current,
    1,
  );
  // If there are deleted admins, validate they have non-null deleted_at
  if (deletedAdminsResponse.data.length > 0) {
    for (const adminItem of deletedAdminsResponse.data) {
      TestValidator.predicate(
        "deleted admin has non-null deleted_at",
        adminItem.deleted_at !== null,
      );
    }
  }
  // 4. Test pagination with status filter applied
  // Create additional admins to test pagination
  const secondAdmin = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(secondAdmin);
  const thirdAdmin = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(thirdAdmin);
  // Test pagination with limit=2 and page=1
  const paginatedResponse =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        status: "active",
        page: 1,
        limit: 2,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(paginatedResponse);
  // Validate pagination values
  TestValidator.equals(
    "paginated limit is 2",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "paginated current is 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records >= 3",
    paginatedResponse.pagination.records >= 3,
  );
  TestValidator.predicate(
    "data length <= 2",
    paginatedResponse.data.length <= 2,
  );
  // Calculate expected pages
  const expectedPages = Math.ceil(paginatedResponse.pagination.records / 2);
  TestValidator.equals(
    "pages calculated correctly",
    paginatedResponse.pagination.pages,
    expectedPages,
  );
  // Test page 2 pagination
  if (paginatedResponse.pagination.pages >= 2) {
    const page2Response = await api.functional.ecommerceMall.admin.admins.index(
      adminConnection,
      {
        body: {
          status: "active",
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
    typia.assert(page2Response);
    TestValidator.equals(
      "page 2 current is 2",
      page2Response.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 data length <= 2",
      page2Response.data.length <= 2,
    );
    // Ensure no overlap between page 1 and page 2
    const page1Ids = paginatedResponse.data.map((a) => a.id);
    const page2Ids = page2Response.data.map((a) => a.id);
    for (const id of page2Ids) {
      TestValidator.equals(
        "page 2 items not in page 1",
        page1Ids.includes(id),
        false,
      );
    }
  }
  // 5. Test combined filtering with search
  const combinedFilterResponse =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        status: "active",
        search: admin.name.substring(0, 5),
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(combinedFilterResponse);
  // If results found, all should be active and match search criteria
  for (const adminItem of combinedFilterResponse.data) {
    TestValidator.equals(
      "combined filter: admin is active",
      adminItem.deleted_at,
      null,
    );
    TestValidator.predicate(
      "combined filter: name contains search term",
      adminItem.name
        .toLowerCase()
        .includes(admin.name.toLowerCase().substring(0, 5)),
    );
  }
}
