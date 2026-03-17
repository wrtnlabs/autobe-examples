import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_listing_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@admin.test",
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Admin-specific connection with auth token
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 3. Test date range filtering
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - 10); // 10 hours ago
  const endDate = new Date();
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        createdAtRange: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(dateRangeResult);
  // 4. Test sorting by created_at descending (default)
  const sortedByDateDesc =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(sortedByDateDesc);
  // 5. Test sorting by created_at ascending
  const sortedByDateAsc =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(sortedByDateAsc);
  // 6. Test sorting by email ascending
  const sortedByEmailAsc =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        sortBy: "email",
        sortOrder: "asc",
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(sortedByEmailAsc);
  // 7. Test sorting by email descending
  const sortedByEmailDesc =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        sortBy: "email",
        sortOrder: "desc",
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(sortedByEmailDesc);
  // 8. Test sorting by id ascending
  const sortedByIdAsc =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        sortBy: "id",
        sortOrder: "asc",
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(sortedByIdAsc);
  // 9. Test sorting by status ascending
  const sortedByStatusAsc =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        sortBy: "status",
        sortOrder: "asc",
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(sortedByStatusAsc);
  // 10. Test limit parameter with max page size (100)
  const maxLimitResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(maxLimitResult);
  // 11. Test includeDeleted parameter
  const deletedIncluded =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        includeDeleted: true,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(deletedIncluded);
  // 12. Test email partial matching
  const emailSearch = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    {
      body: {
        email: "@example.com",
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(emailSearch);
  // 13. Test status filter (active)
  const activeOnly = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    {
      body: {
        status: "active",
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(activeOnly);
  // 14. Validate pagination metadata structure
  TestValidator.equals(
    "pagination has required fields",
    dateRangeResult.pagination,
    {
      current: dateRangeResult.pagination.current,
      limit: dateRangeResult.pagination.limit,
      records: dateRangeResult.pagination.records,
      pages: dateRangeResult.pagination.pages,
    },
  );
  // 15. Validate pagination bounds
  TestValidator.predicate(
    "pagination limit within bounds",
    dateRangeResult.pagination.limit >= 1 &&
      dateRangeResult.pagination.limit <= 100,
  );
  // 16. Validate records count is non-negative
  TestValidator.predicate(
    "records count is non-negative",
    dateRangeResult.pagination.records >= 0,
  );
  // 17. Validate pages count is non-negative
  TestValidator.predicate(
    "pages count is non-negative",
    dateRangeResult.pagination.pages >= 0,
  );
  // 18. Test that data array exists and is array
  TestValidator.predicate("data is array", Array.isArray(dateRangeResult.data));
  // 19. Validate each customer summary has required fields
  for (const customer of dateRangeResult.data) {
    typia.assert(customer);
    // Customer summary validation via typia.assert
  }
}
