import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_admin_wishlist_search_date_range_filtering(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin!1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string & tags.Format<"email"> = adminAuthorized.email;
  const adminPassword: string & tags.Format<"password"> =
    adminJoinInput.password;

  // 2. Customer join
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Customer!1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/home" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuthorized);

  const customerEmail: string & tags.Format<"email"> = customerAuthorized.email;
  const customerPassword: string = customerJoinInput.password;

  // 3. Customer login (ensure session and token set correctly)
  const customerLoginInput = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/home" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginInput,
    });
  typia.assert(customerLoginAuthorized);

  // 4. Create two wishlists for the customer, spaced in time
  const firstWishlistBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const firstWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: firstWishlistBody,
    });
  typia.assert(firstWishlist);

  // small logical delay by generating some random data
  void RandomGenerator.paragraph({ sentences: 3 });

  const secondWishlistBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default: false,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const secondWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: secondWishlistBody,
    });
  typia.assert(secondWishlist);

  const firstCreatedAt: string & tags.Format<"date-time"> =
    firstWishlist.created_at;
  const secondCreatedAt: string & tags.Format<"date-time"> =
    secondWishlist.created_at;

  // Determine min/max created_at for combined window
  const minCreatedAt: string & tags.Format<"date-time"> =
    firstCreatedAt <= secondCreatedAt ? firstCreatedAt : secondCreatedAt;
  const maxCreatedAt: string & tags.Format<"date-time"> =
    firstCreatedAt >= secondCreatedAt ? firstCreatedAt : secondCreatedAt;

  // 5. Switch to admin via login (ensuring proper admin token in headers)
  const adminLoginInput = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/home" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLoginAuthorized);

  // Helper to perform admin search with given createdFrom/createdTo
  const search = async (
    createdFrom: string | undefined,
    createdTo: string | undefined,
  ): Promise<IPageIShoppingMallWishlist.ISummary> => {
    const requestBody = {
      page: 0 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
      search: undefined,
      status: "active",
      createdFrom,
      createdTo,
      orderBy: "created_at",
      orderDirection: "asc",
    } satisfies IShoppingMallWishlist.IRequest;

    const pageResult: IPageIShoppingMallWishlist.ISummary =
      await api.functional.shoppingMall.admin.wishlists.index(connection, {
        body: requestBody,
      });
    typia.assert(pageResult);
    return pageResult;
  };

  // 6-a. Window including only first wishlist
  const firstOnlyPage = await search(firstCreatedAt, firstCreatedAt);

  const firstOnlyIds = firstOnlyPage.data.map((w) => w.id);

  TestValidator.predicate(
    "first-only window should contain first wishlist id",
    () => firstOnlyIds.includes(firstWishlist.id),
  );

  TestValidator.predicate(
    "first-only window should not contain second wishlist id",
    () => !firstOnlyIds.includes(secondWishlist.id),
  );

  // 6-b. Window including only second wishlist
  const secondOnlyPage = await search(secondCreatedAt, secondCreatedAt);
  const secondOnlyIds = secondOnlyPage.data.map((w) => w.id);

  TestValidator.predicate(
    "second-only window should contain second wishlist id",
    () => secondOnlyIds.includes(secondWishlist.id),
  );

  TestValidator.predicate(
    "second-only window should not contain first wishlist id",
    () => !secondOnlyIds.includes(firstWishlist.id),
  );

  // 6-c. Broad window including both
  const bothPage = await search(minCreatedAt, maxCreatedAt);
  const bothIds = bothPage.data.map((w) => w.id);

  TestValidator.predicate("broad window should contain first wishlist id", () =>
    bothIds.includes(firstWishlist.id),
  );

  TestValidator.predicate(
    "broad window should contain second wishlist id",
    () => bothIds.includes(secondWishlist.id),
  );

  // 7. Verify ordering for ascending and descending
  const ascRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: undefined,
    status: "active",
    createdFrom: minCreatedAt,
    createdTo: maxCreatedAt,
    orderBy: "created_at",
    orderDirection: "asc",
  } satisfies IShoppingMallWishlist.IRequest;

  const ascPage: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.admin.wishlists.index(connection, {
      body: ascRequestBody,
    });
  typia.assert(ascPage);

  const ascData = ascPage.data;
  if (ascData.length >= 2) {
    TestValidator.predicate("ascending order by created_at", () => {
      for (let i = 1; i < ascData.length; i++) {
        if (ascData[i - 1].created_at > ascData[i].created_at) return false;
      }
      return true;
    });
  }

  const descRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: undefined,
    status: "active",
    createdFrom: minCreatedAt,
    createdTo: maxCreatedAt,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IShoppingMallWishlist.IRequest;

  const descPage: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.admin.wishlists.index(connection, {
      body: descRequestBody,
    });
  typia.assert(descPage);

  const descData = descPage.data;
  if (descData.length >= 2) {
    TestValidator.predicate("descending order by created_at", () => {
      for (let i = 1; i < descData.length; i++) {
        if (descData[i - 1].created_at < descData[i].created_at) return false;
      }
      return true;
    });
  }
}
