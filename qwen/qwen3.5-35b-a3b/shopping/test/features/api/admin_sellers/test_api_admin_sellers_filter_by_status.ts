import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sellers_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Test filtering by each status type
  const statuses: Array<"pending" | "approved" | "rejected"> = [
    "pending",
    "approved",
    "rejected",
  ];
  for (const status of statuses) {
    const filteredSellers =
      await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
        body: {
          status,
          pageSize: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      });
    typia.assert(filteredSellers);
    // Validate pagination exists
    TestValidator.predicate(
      `${status} pagination exists`,
      () => filteredSellers.pagination !== undefined,
    );
    // Validate data is array
    TestValidator.predicate(`${status} data is array`, () =>
      Array.isArray(filteredSellers.data),
    );
    // Validate each seller has correct status
    filteredSellers.data.forEach((seller) => {
      TestValidator.equals(
        `${status} seller has correct status`,
        seller.status,
        status,
      );
    });
  }
  // 3. Test combination filters
  const emailFilter = RandomGenerator.alphabets(8);
  const createdAfter: string & tags.Format<"date-time"> = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString() as string & tags.Format<"date-time">;
  const createdBefore: string & tags.Format<"date-time"> =
    new Date().toISOString();
  const combinationFilter =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        email: emailFilter,
        status: "approved",
        createdAfter,
        createdBefore,
        pageSize: 20,
      },
    });
  typia.assert(combinationFilter);
  TestValidator.predicate(
    "combination filter pagination exists",
    () => combinationFilter.pagination !== undefined,
  );
  // Validate each seller matches all filter criteria
  combinationFilter.data.forEach((seller) => {
    TestValidator.equals(
      "combination filter status matches",
      seller.status,
      "approved",
    );
    typia.assert(seller.createdAt);
    typia.assert(seller.updatedAt);
  });
  // 4. Test cursor-based pagination
  const firstPage = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        status: "pending",
        pageSize: 10,
      },
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page has pagination",
    () => firstPage.pagination !== undefined,
  );
  TestValidator.predicate("first page has data array", () =>
    Array.isArray(firstPage.data),
  );
  // Get cursor from first page
  const cursor = firstPage.pagination.current;
  if (cursor < firstPage.pagination.pages) {
    const nextPage = await api.functional.ecommerceMall.admin.sellers.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: (cursor + 1).toString(),
          pageSize: 10,
        },
      },
    );
    typia.assert(nextPage);
    // Validate second page exists and has data
    TestValidator.predicate(
      "second page has pagination",
      () => nextPage.pagination !== undefined,
    );
    TestValidator.predicate("second page has data array", () =>
      Array.isArray(nextPage.data),
    );
    // Validate pagination metadata
    TestValidator.equals(
      "second page current matches",
      nextPage.pagination.current,
      cursor + 1,
    );
  }
  // 5. Test sorting with status filter
  const sortedByCreatedAt =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        status: "approved",
        sortBy: "createdAt",
        sortOrder: "desc",
        pageSize: 10,
      },
    });
  typia.assert(sortedByCreatedAt);
  TestValidator.predicate(
    "sorted result pagination exists",
    () => sortedByCreatedAt.pagination !== undefined,
  );
  // Validate sorting is consistent
  if (sortedByCreatedAt.data.length > 1) {
    for (let i = 1; i < sortedByCreatedAt.data.length; i++) {
      const prevDate = new Date(
        sortedByCreatedAt.data[i - 1].createdAt,
      ).getTime();
      const currDate = new Date(sortedByCreatedAt.data[i].createdAt).getTime();
      TestValidator.predicate(
        "sorted by createdAt desc is correct order",
        prevDate >= currDate,
      );
    }
  }
}