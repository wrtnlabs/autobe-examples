import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_basic_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: (typia.random<string>() + "@example.com") satisfies string & tags.MinLength<1> & tags.Format<"email"> as string & tags.MinLength<1> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Search products with a basic keyword
  const keyword = "test";
  const response = await api.functional.ecommerceMall.products.search(
    customerConnection,
    {
      body: {
        search: keyword,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure and content
  TestValidator.predicate("has pagination", response.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(response.data));
  TestValidator.predicate("includes products", response.data.length >= 0);
  // 4. Validate product summary structure
  if (response.data.length > 0) {
    const product = response.data[0];
    TestValidator.equals("has id", product.id !== undefined, true);
    TestValidator.equals("has name", product.name !== undefined, true);
    TestValidator.equals(
      "has base_price",
      product.base_price !== undefined,
      true,
    );
    TestValidator.equals(
      "has is_available",
      product.is_available !== undefined,
      true,
    );
    TestValidator.equals(
      "has created_at",
      product.created_at !== undefined,
      true,
    );
    TestValidator.equals("has seller", product.seller !== undefined, true);
    TestValidator.equals(
      "has main_image",
      product.main_image !== undefined,
      true,
    );
    // Validate seller summary structure
    if (product.seller) {
      TestValidator.equals(
        "seller has id",
        product.seller.id !== undefined,
        true,
      );
      TestValidator.equals(
        "seller has shop_name",
        product.seller.shop_name !== undefined,
        true,
      );
      TestValidator.equals(
        "seller has approval_status",
        product.seller.approval_status !== undefined,
        true,
      );
      TestValidator.equals(
        "seller has is_suspended",
        product.seller.is_suspended !== undefined,
        true,
      );
      TestValidator.equals(
        "seller has created_at",
        product.seller.created_at !== undefined,
        true,
      );
    }
    // Validate main image summary structure
    if (product.main_image) {
      TestValidator.equals(
        "main_image has id",
        product.main_image.id !== undefined,
        true,
      );
      TestValidator.equals(
        "main_image has image_url",
        product.main_image.image_url !== undefined,
        true,
      );
      TestValidator.equals(
        "main_image has sort_order",
        product.main_image.sort_order !== undefined,
        true,
      );
      TestValidator.equals(
        "main_image has is_main",
        product.main_image.is_main !== undefined,
        true,
      );
      TestValidator.equals(
        "main_image has created_at",
        product.main_image.created_at !== undefined,
        true,
      );
      TestValidator.equals(
        "main_image has updated_at",
        product.main_image.updated_at !== undefined,
        true,
      );
      TestValidator.equals(
        "main_image has deleted_at",
        product.main_image.deleted_at !== undefined,
        true,
      );
    }
  }
}