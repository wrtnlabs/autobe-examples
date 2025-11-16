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

export async function test_api_admin_retrieve_seller_session_records(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const adminPayload: IShoppingMallAdmin.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "ValidPass123!",
    phone_number: null,
    role: "admin",
  };
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminPayload });
  typia.assert(admin);

  // 2. Create a seller account
  const sellerPayload: IShoppingMallSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "ValidSellerPass123!",
  };
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerPayload,
    });
  typia.assert(seller);

  // 3. Retrieve seller sessions with pagination and optional filters
  const searchKeyword = null; // no specific search filter applied
  const requestBody: IShoppingMallSellerSession.IRequest = {
    page: 1,
    limit: 10,
    search: searchKeyword,
  };
  const sessionsPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sellerSessions.index(
      connection,
      { sellerId: seller.id, body: requestBody },
    );
  typia.assert(sessionsPage);

  // Validate pagination properties
  const { pagination, data } = sessionsPage;
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1 || pagination.current === 0,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    pagination.limit === 10 || pagination.limit === 0,
  );
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);

  // Validate data array and session item fields
  TestValidator.predicate("data is array", Array.isArray(data));
  for (const session of data) {
    typia.assert(session);

    TestValidator.predicate(
      "session id is non-empty string",
      typeof session.id === "string" && session.id.length > 0,
    );

    TestValidator.equals(
      "session seller id matches",
      session.shopping_mall_seller_id,
      seller.id,
    );

    TestValidator.predicate(
      "session created_at is ISO 8601 string",
      typeof session.created_at === "string" &&
        session.created_at.match(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
        ) !== null,
    );
  }
}
