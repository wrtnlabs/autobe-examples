import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_seller_join(connection: api.IConnection) {
  // Generate realistic seller registration data
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;

  // Call the seller join API to create the account
  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(authorizedSeller);

  // Validate key properties in the response
  TestValidator.predicate(
    "seller ID is valid UUID",
    typeof authorizedSeller.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        authorizedSeller.id,
      ),
  );
  TestValidator.equals(
    "seller email matches input",
    authorizedSeller.email,
    sellerCreateBody.email,
  );
  TestValidator.predicate(
    "password_hash is non-empty string",
    typeof authorizedSeller.password_hash === "string" &&
      authorizedSeller.password_hash.length > 0,
  );
  TestValidator.equals(
    "store name matches input",
    authorizedSeller.store_name,
    sellerCreateBody.store_name,
  );

  // Verify timestamps exist and are ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof authorizedSeller.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
        authorizedSeller.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof authorizedSeller.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
        authorizedSeller.updated_at,
      ),
  );

  // deleted_at may be null or undefined, explicitly check it
  if (
    authorizedSeller.deleted_at !== null &&
    authorizedSeller.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is ISO 8601 string if present",
      typeof authorizedSeller.deleted_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
          authorizedSeller.deleted_at,
        ),
    );
  }

  // Validate related sessions and profiles if present
  if (authorizedSeller.shopping_mall_seller_sessions !== undefined) {
    TestValidator.predicate(
      "shopping_mall_seller_sessions is an array",
      Array.isArray(authorizedSeller.shopping_mall_seller_sessions),
    );
    for (const session of authorizedSeller.shopping_mall_seller_sessions ??
      []) {
      typia.assert<IShoppingMallSellerSession>(session);
    }
  }
  if (authorizedSeller.shopping_mall_seller_profiles !== undefined) {
    typia.assert<IShoppingMallSellerProfile>(
      authorizedSeller.shopping_mall_seller_profiles,
    );
  }

  // Validate token structure
  const token: IAuthorizationToken = authorizedSeller.token;
  typia.assert<IAuthorizationToken>(token);
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO 8601 string",
    typeof token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 string",
    typeof token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
        token.refreshable_until,
      ),
  );
}
