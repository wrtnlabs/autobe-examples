import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_browse_all_visible_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create seller account (pending status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Approve seller registration
  const approvalRequest: IECommerceMallSellerApprovalRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: seller.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalRequest);
  // 4. Seller creates 3 products with variants and inventory
  const productList: IECommerceMallProduct[] = [];
  for (let i = 0; i < 3; i++) {
    // 4a. Create product
    const product =
      await generate_random_e_commerce_mall_seller_products_create(
        sellerConnection,
        {
          body: {
            name: `Test Product ${i + 1} - ${RandomGenerator.alphabets(8)}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            base_price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          },
        },
      );
    typia.assert(product);
    // 4b. Create variant
    const variant =
      await generate_random_e_commerce_mall_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
            price: null,
            options: [
              {
                key: "color",
                value: RandomGenerator.pick(["Red", "Blue", "Green"]),
              },
            ],
          },
        },
      );
    typia.assert(variant);
    // 4c. Add inventory (restock)
    const inventoryRecord =
      await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
        sellerConnection,
        {
          params: {
            productId: product.id,
            variantId: variant.id,
          },
          body: {
            quantity_change: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<100>
            >(),
            reason: "Seller restock for testing",
          },
        },
      );
    typia.assert(inventoryRecord);
    productList.push(product);
  }
  // 5. Create fresh customer for browse
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 6. Browse all visible products with default parameters (newest sort)
  const browseResult: IPageIECommerceMallProduct.ISummary =
    await api.functional.eCommerceMall.customer.products.index(
      customerConnection,
      {
        body: {
          sort: "newest",
        },
      },
    );
  typia.assert(browseResult);
  // 6a. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    () => browseResult.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    () => browseResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => browseResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => browseResult.pagination.pages >= 0,
  );
  // 6b. Validate each product summary with typia.assert
  for (const product of browseResult.data) {
    typia.assert(product);
  }
  // 6c. Validate products sorted by newest first (created_at descending)
  for (let i = 1; i < browseResult.data.length; i++) {
    TestValidator.predicate(
      `product[${i - 1}] created_at >= product[${i}] created_at`,
      () =>
        new Date(browseResult.data[i - 1].created_at).getTime() >=
        new Date(browseResult.data[i].created_at).getTime(),
    );
  }
  // 7. Test pagination with limit=2
  const limitedResult: IPageIECommerceMallProduct.ISummary =
    await api.functional.eCommerceMall.customer.products.index(
      customerConnection,
      {
        body: {
          limit: 2,
          sort: "newest",
        },
      },
    );
  typia.assert(limitedResult);
  TestValidator.predicate(
    "limit respects request",
    () => limitedResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination limit is 2",
    limitedResult.pagination.limit,
    2,
  );
}
