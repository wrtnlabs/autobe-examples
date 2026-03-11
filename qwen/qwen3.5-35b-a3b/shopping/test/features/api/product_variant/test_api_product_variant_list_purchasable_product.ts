import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_variant_list_purchasable_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail satisfies string as string & tags.Format<"email">,
      password: sellerPassword satisfies string as string & tags.Format<"password">,
      href: "https://test.com/seller-join",
      referrer: "https://test.com/seller-form",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Login seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Create product with category
  const category = typia.random<IEcommerceMallCategory.ISummary>();
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1000>>(),
        category_id: category.id,
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Add variant to product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: skuCode,
          option_values: { size: "Large", color: "Red" },
          stock_quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          price_override: typia.random<number & tags.Type<"int32"> & tags.Minimum<500>>(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>();
  const customerPassword = typia.random<string & tags.Format<"password"> & tags.MinLength<8>>();
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://test.com/customer-join",
      referrer: "https://test.com/customer-form",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 5. List variants
  const variantsResponse =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(variantsResponse);
  // 6. Validate response
  TestValidator.equals("variants count", variantsResponse.data.length, 1);
  const listedVariant = variantsResponse.data[0];
  TestValidator.equals("SKU code", listedVariant.skuCode, skuCode);
  TestValidator.equals(
    "stock quantity",
    listedVariant.stockQuantity,
    variant.stock_quantity,
  );
  TestValidator.equals(
    "active status",
    listedVariant.isActive,
    variant.is_active,
  );
  // 7. Test filtering by SKU code
  const skuFilteredResponse =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          sku_code: skuCode,
        },
      },
    );
  typia.assert(skuFilteredResponse);
  TestValidator.equals(
    "filtered variants count",
    skuFilteredResponse.data.length,
    1,
  );
  // 8. Test filtering by stock
  const stockFilteredResponse =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          stock_quantity: 1,
        },
      },
    );
  typia.assert(stockFilteredResponse);
  TestValidator.equals(
    "stock filtered variants count",
    stockFilteredResponse.data.length,
    1,
  );
  // 9. Test filtering by option values
  const optionFilteredResponse =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          option_values: { size: "Large", color: "Red" },
        },
      },
    );
  typia.assert(optionFilteredResponse);
  TestValidator.equals(
    "option filtered variants count",
    optionFilteredResponse.data.length,
    1,
  );
  // 10. Validate pagination metadata
  TestValidator.equals("current page", variantsResponse.pagination.current, 1);
  TestValidator.equals("limit", variantsResponse.pagination.limit, 10);
  TestValidator.equals("total records", variantsResponse.pagination.records, 1);
  TestValidator.equals("total pages", variantsResponse.pagination.pages, 1);
}