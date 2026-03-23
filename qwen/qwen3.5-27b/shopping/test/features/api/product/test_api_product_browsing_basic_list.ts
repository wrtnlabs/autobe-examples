import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test basic product browsing functionality for customers.
 * Validates product listing endpoint with no filters applied,
 * checking pagination metadata and product summary structure.
 */
export async function test_api_product_browsing_basic_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Request product listing with no filters
  const response = await api.functional.shoppingMall.customer.products.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is default 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate product list structure
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 5. Validate each product summary
  await ArrayUtil.asyncForEach(response.data, async (product, index) => {
    // Required fields exist
    TestValidator.predicate(
      `product[${index}] has id`,
      product.id !== undefined,
    );
    TestValidator.predicate(
      `product[${index}] has name`,
      product.name !== undefined,
    );
    TestValidator.predicate(
      `product[${index}] has description`,
      product.description !== undefined,
    );
    TestValidator.predicate(
      `product[${index}] has basePrice`,
      product.basePrice !== undefined,
    );
    TestValidator.predicate(
      `product[${index}] has category`,
      product.category !== undefined,
    );
    TestValidator.predicate(
      `product[${index}] has seller`,
      product.seller !== undefined,
    );
    TestValidator.predicate(
      `product[${index}] has imageUrl`,
      product.imageUrl !== undefined || product.imageUrl === null,
    );
    TestValidator.predicate(
      `product[${index}] has available`,
      product.available !== undefined,
    );
    TestValidator.predicate(
      `product[${index}] has variantCount`,
      product.variantCount !== undefined,
    );
    // Category structure
    typia.assert(product.category);
    TestValidator.predicate(
      `product[${index}] category has id`,
      product.category.id !== undefined,
    );
    TestValidator.predicate(
      `product[${index}] category has name`,
      product.category.name !== undefined,
    );
    // Seller structure
    typia.assert(product.seller);
    TestValidator.predicate(
      `product[${index}] seller has id`,
      product.seller.id !== undefined,
    );
    TestValidator.predicate(
      `product[${index}] seller has shop_name`,
      product.seller.shop_name !== undefined,
    );
    // Availability logic
    if (product.variantCount === 0) {
      TestValidator.equals(
        `product[${index}] with no variants is unavailable`,
        product.available,
        false,
      );
    } else {
      TestValidator.predicate(
        `product[${index}] with variants has valid availability`,
        typeof product.available === "boolean",
      );
    }
  });
}
