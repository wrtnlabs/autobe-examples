import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test password reset request filtering functionality with various filter combinations.
 *
 * Tests the admin password reset audit endpoint that supports filtering by:
 * - actorType (customer, seller, admin)
 * - requestStatus (pending, used, expired)
 * - email pattern matching
 * - createdAt date range (createdAtFrom, createdAtTo)
 *
 * Also tests sorting functionality on all supported columns.
 */
export async function test_api_admin_password_reset_audit_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Step 2: Test actorType filter - customer
  const customerActorTypeResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          actorType: "customer",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(customerActorTypeResult);
  // Step 3: Test actorType filter - seller
  const sellerActorTypeResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          actorType: "seller",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sellerActorTypeResult);
  // Step 4: Test actorType filter - admin
  const adminActorTypeResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          actorType: "admin",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(adminActorTypeResult);
  // Step 5: Test requestStatus filter - pending
  const pendingStatusResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          requestStatus: "pending",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(pendingStatusResult);
  // Step 6: Test requestStatus filter - used
  const usedStatusResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          requestStatus: "used",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(usedStatusResult);
  // Step 7: Test requestStatus filter - expired
  const expiredStatusResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          requestStatus: "expired",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(expiredStatusResult);
  // Step 8: Test email pattern filter
  const emailPattern = RandomGenerator.alphabets(5).toLowerCase();
  const emailFilter = {
    body: {
      email: `${emailPattern}@test.com`,
      limit: 10,
    } satisfies IEcommerceMallSellerPasswordReset.IRequest,
  };
  const emailResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      emailFilter,
    );
  typia.assert(emailResult);
  // Step 9: Test createdAtFrom filter
  const createdAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const createdAtFromFilter = {
    body: {
      createdAtFrom,
      limit: 10,
    } satisfies IEcommerceMallSellerPasswordReset.IRequest,
  };
  const createdAtFromResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      createdAtFromFilter,
    );
  typia.assert(createdAtFromResult);
  // Step 10: Test createdAtTo filter
  const createdAtTo = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const createdAtToFilter = {
    body: {
      createdAtTo,
      limit: 10,
    } satisfies IEcommerceMallSellerPasswordReset.IRequest,
  };
  const createdAtToResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      createdAtToFilter,
    );
  typia.assert(createdAtToResult);
  // Step 11: Test combined filters (actorType + requestStatus + date range)
  const combinedFilter = {
    body: {
      actorType: "seller",
      requestStatus: "pending",
      createdAtFrom,
      createdAtTo,
      limit: 10,
    } satisfies IEcommerceMallSellerPasswordReset.IRequest,
  };
  const combinedResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      combinedFilter,
    );
  typia.assert(combinedResult);
  // Step 12: Test sorting by createdAt (ascending)
  const sortCreatedAtAscResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          sort: "createdAt",
          sortOrder: "asc",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortCreatedAtAscResult);
  // Step 13: Test sorting by createdAt (descending)
  const sortCreatedAtDescResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          sort: "createdAt",
          sortOrder: "desc",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortCreatedAtDescResult);
  // Step 14: Test sorting by expiredAt (ascending)
  const sortExpiredAtAscResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          sort: "expiredAt",
          sortOrder: "asc",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortExpiredAtAscResult);
  // Step 15: Test sorting by requestStatus (ascending)
  const sortRequestStatusAscResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          sort: "requestStatus",
          sortOrder: "asc",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortRequestStatusAscResult);
  // Step 16: Test sorting by requestStatus (descending)
  const sortRequestStatusDescResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          sort: "requestStatus",
          sortOrder: "desc",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortRequestStatusDescResult);
  // Step 17: Test sorting by actorType (ascending)
  const sortActorTypeAscResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          sort: "actorType",
          sortOrder: "asc",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortActorTypeAscResult);
  // Step 18: Test sorting by actorType (descending)
  const sortActorTypeDescResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          sort: "actorType",
          sortOrder: "desc",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortActorTypeDescResult);
  // Step 19: Test sorting by email (ascending)
  const sortEmailAscResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          sort: "email",
          sortOrder: "asc",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortEmailAscResult);
  // Step 20: Test sorting by email (descending)
  const sortEmailDescResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      {
        body: {
          sort: "email",
          sortOrder: "desc",
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortEmailDescResult);
  // Step 21: Test pagination with filters
  const paginatedFilter = {
    body: {
      page: 2,
      limit: 5,
      actorType: "customer",
    } satisfies IEcommerceMallSellerPasswordReset.IRequest,
  };
  const paginatedResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      paginatedFilter,
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 5);
  TestValidator.equals(
    "pagination records match data length",
    paginatedResult.pagination.records,
    paginatedResult.data.length,
  );
  // Step 22: Test combined filters with sorting
  const combinedSortedFilter = {
    body: {
      actorType: "seller",
      requestStatus: "pending",
      sort: "createdAt",
      sortOrder: "desc",
      limit: 10,
    } satisfies IEcommerceMallSellerPasswordReset.IRequest,
  };
  const combinedSortedResult =
    await api.functional.ecommerceMall.admin.password_resets.index(
      adminConnection,
      combinedSortedFilter,
    );
  typia.assert(combinedSortedResult);
  TestValidator.equals(
    "combined sorted filter records match data length",
    combinedSortedResult.pagination.records,
    combinedSortedResult.data.length,
  );
}
