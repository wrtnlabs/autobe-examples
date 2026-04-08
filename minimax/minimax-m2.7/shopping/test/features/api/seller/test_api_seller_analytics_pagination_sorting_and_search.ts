import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_analytics_pagination_sorting_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create multiple sellers for pagination and sorting tests
  const sellers = await ArrayUtil.asyncRepeat(5, async () => {
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const sellerConnection: api.IConnection = { host: connection.host };
    // Join seller
    await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
    return { email: sellerEmail };
  });
  typia.assert(sellers);
  // 3. Test pagination - default values
  const defaultPagination =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(defaultPagination);
  TestValidator.equals(
    "default pagination page",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultPagination.pagination.limit,
    20,
  );
  TestValidator.predicate("has data", defaultPagination.data.length > 0);
  // 4. Test pagination - explicit page and limit
  const page2Limit10 =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(page2Limit10);
  TestValidator.equals("page 2 current", page2Limit10.pagination.current, 2);
  TestValidator.equals("limit 10", page2Limit10.pagination.limit, 10);
  // 5. Test pagination - max limit (100)
  const maxLimit =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          limit: 100 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals("max limit", maxLimit.pagination.limit, 100);
  // 6. Test sorting - created_at (default sort)
  const sortByCreatedAt =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(sortByCreatedAt);
  // Verify descending order
  for (let i = 1; i < sortByCreatedAt.data.length; i++) {
    const prev = new Date(sortByCreatedAt.data[i - 1].createdAt).getTime();
    const curr = new Date(sortByCreatedAt.data[i].createdAt).getTime();
    TestValidator.predicate(
      `created_at desc order at index ${i}`,
      prev >= curr,
    );
  }
  // 7. Test sorting - created_at ascending
  const sortByCreatedAtAsc =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          order: "asc",
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);
  // Verify ascending order
  for (let i = 1; i < sortByCreatedAtAsc.data.length; i++) {
    const prev = new Date(sortByCreatedAtAsc.data[i - 1].createdAt).getTime();
    const curr = new Date(sortByCreatedAtAsc.data[i].createdAt).getTime();
    TestValidator.predicate(`created_at asc order at index ${i}`, prev <= curr);
  }
  // 8. Test sorting - total_revenue
  const sortByRevenue =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          sort: "total_revenue",
          order: "desc",
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(sortByRevenue);
  // 9. Test sorting - total_orders
  const sortByOrders =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          sort: "total_orders",
          order: "desc",
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(sortByOrders);
  // 10. Test sorting - product_count
  const sortByProductCount =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          sort: "product_count",
          order: "desc",
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(sortByProductCount);
  // 11. Test search - email partial match
  const searchByEmail =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          search: sellers[0].email.substring(0, 5),
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(searchByEmail);
  TestValidator.predicate(
    "search returns results",
    searchByEmail.data.length > 0,
  );
  // 12. Test search - email exact match
  const exactEmailSearch =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          search: sellers[0].email,
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(exactEmailSearch);
  TestValidator.predicate(
    "exact email returns seller",
    exactEmailSearch.data.some((s) => s.email === sellers[0].email),
  );
  // 13. Test search - case insensitive (ILIKE)
  const caseInsensitiveSearch =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          search: sellers[0].email.toUpperCase(),
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(caseInsensitiveSearch);
  TestValidator.predicate(
    "case insensitive search returns results",
    caseInsensitiveSearch.data.length >= 1,
  );
  // 14. Test filter - approval status
  const pendingSellers =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          approvalStatus: "pending",
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(pendingSellers);
  for (const seller of pendingSellers.data) {
    TestValidator.equals(
      "all sellers pending",
      seller.approvalStatus,
      "pending",
    );
  }
  // 15. Test combined filters - pagination + sorting + search
  const combinedFilters =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          approvalStatus: "pending",
          sort: "created_at",
          order: "desc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(combinedFilters);
  TestValidator.equals(
    "combined pagination limit",
    combinedFilters.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "combined filters work",
    combinedFilters.data.length <= 10,
  );
  // 16. Test empty search
  const emptySearch =
    await api.functional.ecommerceMall.admin.admin.analytics.sellers.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_seller_email_xyz_12345",
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns no results",
    emptySearch.data.length,
    0,
  );
}
