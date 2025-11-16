import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_shopping_mall_product_detail_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer account (join)
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(authorizedCustomer);

  // Step 2: Use a realistic random productCode (non-empty alphanumeric string)
  const productCode: string = RandomGenerator.alphaNumeric(10);

  const productDetails: IShoppingMallProduct =
    await api.functional.shoppingMall.customer.shoppingMallProducts.at(
      connection,
      {
        productCode,
      },
    );
  typia.assert(productDetails);

  // Step 3: Assert the product detail fields
  TestValidator.equals(
    "product code should match requested code",
    productDetails.code,
    productCode,
  );

  TestValidator.predicate(
    "product name exists and non-empty",
    typeof productDetails.name === "string" && productDetails.name.length > 0,
  );

  TestValidator.predicate(
    "product description null or string",
    productDetails.description === null ||
      typeof productDetails.description === "string",
  );

  TestValidator.predicate(
    "product is_active is boolean",
    typeof productDetails.is_active === "boolean",
  );

  TestValidator.predicate("product created_at is ISO 8601 date-time", () => {
    try {
      typia.assert<string & tags.Format<"date-time">>(
        productDetails.created_at,
      );
      return true;
    } catch {
      return false;
    }
  });

  TestValidator.predicate("product updated_at is ISO 8601 date-time", () => {
    try {
      typia.assert<string & tags.Format<"date-time">>(
        productDetails.updated_at,
      );
      return true;
    } catch {
      return false;
    }
  });

  TestValidator.predicate(
    "product deleted_at is null or ISO 8601 date-time",
    productDetails.deleted_at === null ||
      productDetails.deleted_at === undefined
      ? true
      : (() => {
          try {
            typia.assert<string & tags.Format<"date-time">>(
              productDetails.deleted_at!,
            );
            return true;
          } catch {
            return false;
          }
        })(),
  );
}
