import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_seller_session_index_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins using /auth/admin/join and receives auth tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUser: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminUser);

  // 2. Admin logs in to establish session tokens (although join also provides tokens, simulate full flow)
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        ip: RandomGenerator.mobile(),
        href: "https://admin.shoppingmall.com/dashboard",
        referrer: "https://admin.shoppingmall.com/login",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 3. Assign admin role explicitly to the logged in admin user
  const adminRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: {
        user_id: adminLoggedIn.id,
        role_name: "admin",
      } satisfies IShoppingMallUserRole.ICreate,
    });
  typia.assert(adminRole);

  // 4. Create seller user via /auth/seller/join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerUser: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPassword123!",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerUser);

  // 5. Login seller user
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPassword123!",
        ip: RandomGenerator.mobile(),
        href: "https://seller.shoppingmall.com/dashboard",
        referrer: "https://seller.shoppingmall.com/login",
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLoggedIn);

  // 6. Create seller profile (required before querying sessions)
  const nowISO = new Date().toISOString();
  const sellerProfileCreateBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    store_name: sellerUser.store_name,
    business_registration_number: null,
    contact_email: sellerUser.email,
    contact_phone: null,
    profile_description:
      "Test seller profile created for session search testing.",
    created_at: nowISO,
    updated_at: nowISO,
    deleted_at: null,
  } satisfies IShoppingMallSellerProfile.ICreate;

  const sellerProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: sellerProfileCreateBody,
    });
  typia.assert(sellerProfile);

  // 7. Perform search for seller sessions as admin
  // Prepare search requests with pagination and various filters
  const baseSearch = {
    limit: 10,
    page: 1,
  } satisfies IShoppingMallSellerSession.IRequest;

  // a) Basic paginated search
  const searchAll: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellerSessions.index(connection, {
      body: baseSearch,
    });
  typia.assert(searchAll);
  TestValidator.predicate(
    "pagination should exist",
    searchAll.pagination != null,
  );
  TestValidator.predicate("data is array", Array.isArray(searchAll.data));

  // b) Search filtered by seller id
  const searchBySeller: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellerSessions.index(connection, {
      body: {
        ...baseSearch,
        shopping_mall_seller_id: sellerUser.id,
      },
    });
  typia.assert(searchBySeller);
  TestValidator.equals(
    "filtered seller id",
    searchBySeller.data.every(
      (session) => session.shopping_mall_seller_id === sellerUser.id,
    ),
    true,
  );

  // c) Search filtered by IP
  const ipSample =
    searchAll.data.length > 0 ? searchAll.data[0].ip : "127.0.0.1";
  const searchByIP: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellerSessions.index(connection, {
      body: {
        ...baseSearch,
        ip: ipSample,
      },
    });
  typia.assert(searchByIP);
  TestValidator.equals(
    "filtered ip",
    searchByIP.data.every((session) => session.ip === ipSample),
    true,
  );

  // d) Search with expired_at_gte and expired_at_lte filters
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 3600 * 1000).toISOString();
  const searchByExpiredAt: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellerSessions.index(connection, {
      body: {
        ...baseSearch,
        expired_at_gte: now,
        expired_at_lte: later,
      },
    });
  typia.assert(searchByExpiredAt);
  TestValidator.predicate(
    "expired_at filtering",
    searchByExpiredAt.data.every((session) => {
      if (session.expired_at === null || session.expired_at === undefined)
        return false;
      return session.expired_at >= now && session.expired_at <= later;
    }),
  );
}
