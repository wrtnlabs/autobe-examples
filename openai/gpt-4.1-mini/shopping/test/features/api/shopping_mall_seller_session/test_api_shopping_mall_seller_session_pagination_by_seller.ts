import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_shopping_mall_seller_session_pagination_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins and obtains token
  const sellerCreateInput = {
    email: RandomGenerator.alphaNumeric(8).toLowerCase() + "@example.com",
    password: "Password123!",
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateInput,
    });
  typia.assert(sellerAuth);

  // 2. Admin joins and obtains token
  const adminCreateInput = {
    email: RandomGenerator.alphaNumeric(8).toLowerCase() + "@example.com",
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/referrer",
  } satisfies IShoppingMallAdmin.IJoin;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateInput,
    });
  typia.assert(adminAuth);

  // 3. Admin logs in
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminCreateInput.email,
      password: adminCreateInput.password,
      ip: null,
      href: adminCreateInput.href,
      referrer: adminCreateInput.referrer,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 4. Admin creates seller account
  const sellerCreateFromAdminInput = {
    email: sellerCreateInput.email,
    password: sellerCreateInput.password,
  } satisfies IShoppingMallSeller.ICreate;

  const createdSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.shoppingMallSellers.create(
      connection,
      {
        body: sellerCreateFromAdminInput,
      },
    );
  typia.assert(createdSeller);

  // 5. Seller logs in
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCreateInput.email,
      password: sellerCreateInput.password,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/referrer",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 6. Test pagination and filtering for seller sessions
  const requestPages = [
    {
      page: 1,
      limit: 5,
      filterActive: true,
      sortField: "created_at",
      sortOrder: "desc" as const,
    },
    {
      page: 2,
      limit: 10,
      filterActive: false,
      sortField: "expired_at",
      sortOrder: "asc" as const,
    },
    { page: 1, limit: 3, filterActive: true },
  ];

  for (const pageReq of requestPages) {
    const response: IPageIShoppingMallSellerSession.ISummary =
      await api.functional.shoppingMall.seller.shoppingMallSellers.shoppingMallSellerSessions.index(
        connection,
        {
          shoppingMallSellerId: createdSeller.id,
          body: pageReq satisfies IShoppingMallSellerSession.IRequest,
        },
      );
    typia.assert(response);

    TestValidator.equals(
      `page current equals request page (${pageReq.page})`,
      response.pagination.current,
      pageReq.page,
    );

    TestValidator.predicate(
      "page data length must be less than or equal to limit",
      response.data.length <= pageReq.limit,
    );

    if (pageReq.filterActive === true) {
      for (const session of response.data) {
        TestValidator.predicate(
          "Last active must not be null in active filtered sessions",
          session.last_active_at !== null &&
            session.last_active_at !== undefined,
        );
      }
    }

    if (pageReq.sortField !== undefined && response.data.length >= 2) {
      const values = response.data
        .map((session) => {
          switch (pageReq.sortField) {
            case "created_at":
              return session.created_at;
            case "expired_at":
              return null;
            default:
              return null;
          }
        })
        .filter((v): v is string => v !== null);

      for (let i = 1; i < values.length; ++i) {
        const prev = values[i - 1];
        const cur = values[i];

        if (pageReq.sortOrder === "asc") {
          TestValidator.predicate(
            `Sorted ascending by ${pageReq.sortField}`,
            prev <= cur,
          );
        } else if (pageReq.sortOrder === "desc") {
          TestValidator.predicate(
            `Sorted descending by ${pageReq.sortField}`,
            prev >= cur,
          );
        }
      }
    }
  }
}
