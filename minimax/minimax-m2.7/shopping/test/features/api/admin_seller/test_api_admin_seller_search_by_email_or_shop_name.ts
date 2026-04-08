import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_search_by_email_or_shop_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com/",
    },
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    href: "https://test.example.com/admin/login",
    referrer: "https://test.example.com/",
  } satisfies IEcommerceMallAdmin.ILogin;
  await authorize_admin_login(adminLoginConnection, { body: adminCredentials });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, { body: adminCredentials });
  // 2. Test search with empty body returns paginated seller list
  const allSellersResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {} satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(allSellersResult);
  TestValidator.predicate(
    "returns paginated seller list",
    allSellersResult.data.length >= 0,
  );
  // 3. Test case-insensitive partial email search
  if (allSellersResult.data.length > 0) {
    const firstSellerEmail = allSellersResult.data[0]!.email;
    const emailPrefix = firstSellerEmail.substring(0, 3);
    const emailSearchResult =
      await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
        body: {
          search: emailPrefix,
        } satisfies IEcommerceMallSeller.IRequest,
      });
    typia.assert(emailSearchResult);
    TestValidator.predicate(
      "email search returns sellers with matching email fragment",
      emailSearchResult.data.every((s) =>
        s.email.toLowerCase().includes(emailPrefix.toLowerCase()),
      ),
    );
  }
  // 4. Test search term finds sellers by email OR shop name (ILIKE pattern)
  const searchTerm = "test";
  const broadSearchResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        search: searchTerm,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(broadSearchResult);
  TestValidator.predicate(
    "search term matches sellers by email or shop name",
    broadSearchResult.data.every((s) =>
      s.email.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  // 5. Test date range filtering with createdAtFrom
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateFromResult = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        createdAtFrom: thirtyDaysAgo.toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(dateFromResult);
  TestValidator.predicate(
    "createdAtFrom filter returns only recent sellers",
    dateFromResult.data.every((s) => new Date(s.createdAt) >= thirtyDaysAgo),
  );
  // 6. Test date range filtering with createdAtTo
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateToResult = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        createdAtTo: oneYearAgo.toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(dateToResult);
  TestValidator.predicate(
    "createdAtTo filter returns only older sellers",
    dateToResult.data.every((s) => new Date(s.createdAt) <= oneYearAgo),
  );
  // 7. Test combined date range filtering
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        createdAtFrom: oneYearAgo.toISOString(),
        createdAtTo: thirtyDaysAgo.toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns sellers within range",
    dateRangeResult.data.every(
      (s) =>
        new Date(s.createdAt) >= oneYearAgo &&
        new Date(s.createdAt) <= thirtyDaysAgo,
    ),
  );
  // 8. Test approval status filter
  const statusFilterResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        approvalStatus: "pending",
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(statusFilterResult);
  TestValidator.predicate(
    "approvalStatus filter returns only pending sellers",
    statusFilterResult.data.every((s) => s.approvalStatus === "pending"),
  );
  // 9. Test combined search term with status filter
  const combinedSearchResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        search: "seller",
        approvalStatus: "pending",
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(combinedSearchResult);
  TestValidator.predicate(
    "combined search and status filter returns matching sellers",
    combinedSearchResult.data.every(
      (s) =>
        s.email.toLowerCase().includes("seller") &&
        s.approvalStatus === "pending",
    ),
  );
  // 10. Test combining search term, status, and date range
  const fullFilterResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        search: searchTerm,
        approvalStatus: "approved",
        createdAtFrom: oneYearAgo.toISOString(),
        createdAtTo: thirtyDaysAgo.toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(fullFilterResult);
  TestValidator.predicate(
    "full filter combination returns correctly filtered sellers",
    fullFilterResult.data.every(
      (s) =>
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) &&
        s.approvalStatus === "approved" &&
        new Date(s.createdAt) >= oneYearAgo &&
        new Date(s.createdAt) <= thirtyDaysAgo,
    ),
  );
  // 11. Test pagination with page and limit
  const paginatedResult =
    await api.functional.ecommerceMall.admin.sellers.index(adminConnection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEcommerceMallSeller.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination returns at most limit items",
    paginatedResult.data.length <= 5,
  );
}