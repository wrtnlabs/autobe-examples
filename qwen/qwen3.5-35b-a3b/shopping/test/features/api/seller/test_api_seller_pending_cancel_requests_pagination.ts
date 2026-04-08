import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_pending_cancel_requests_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Seller creates product
  const sellerConnection2: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection2, {
    body: {
      email: sellerAuth.email,
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection2,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates variant
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection2,
      {
        productId: product.id,
        body: {
          sku_code: typia.random<string & tags.MinLength<1>>(),
          option_values: JSON.stringify({ color: "black", size: "L" }),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          price: product.base_price,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer creates 3 orders with valid address
  const address: IEcommerceMallCustomerAddress.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street: RandomGenerator.paragraph({ sentences: 2 }),
    city: typia.random<string & tags.MinLength<1>>(),
    state: typia.random<string & tags.MinLength<1>>(),
    postal_code: typia.random<
      string & tags.MinLength<5> & tags.MaxLength<10>
    >(),
    country: "KR",
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const orders: IEcommerceMallOrder[] = [];
  for (let i = 0; i < 3; i++) {
    const order = await api.functional.ecommerceMall.member.orders.create(
      customerConnection,
      {
        body: {
          shipping_address_id: address.id,
          order_items: [
            {
              product_variant_id: variant.id,
              quantity: 1,
            },
          ],
        },
      },
    );
    typia.assert(order);
    orders.push(order);
  }
  // 6. Customer creates 3 cancellation requests
  const cancellationRequests: IEcommerceMallCancellationRequest[] = [];
  for (const order of orders) {
    const request =
      await api.functional.ecommerceMall.member.cancellation_requests.create(
        customerConnection,
        {
          body: {
            order_item_id: order.items[0].id,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(request);
    cancellationRequests.push(request);
  }
  // 7. Seller pagination: page 1
  const sellerConnection3: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection3, {
    body: {
      email: sellerAuth.email,
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const page1 =
    await api.functional.ecommerceMall.seller.seller.cancel_requests.pending.index(
      sellerConnection3,
      {
        body: {
          limit: 2,
          page: 1,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 has 2 items", page1.data.length, 2);
  TestValidator.equals(
    "page 1 pagination current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 2);
  TestValidator.equals(
    "page 1 pagination records",
    page1.pagination.records,
    3,
  );
  TestValidator.equals("page 1 pagination pages", page1.pagination.pages, 2);
  // Verify all items on page 1 have status='pending'
  page1.data.forEach((request, index) => {
    TestValidator.equals(
      `page 1 item ${index} status is pending`,
      request.status,
      "pending",
    );
  });
  // 8. Seller pagination: page 2
  const page2 =
    await api.functional.ecommerceMall.seller.seller.cancel_requests.pending.index(
      sellerConnection3,
      {
        body: {
          limit: 2,
          page: 2,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 has 1 item", page2.data.length, 1);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 2);
  TestValidator.equals(
    "page 2 pagination records",
    page2.pagination.records,
    3,
  );
  TestValidator.equals("page 2 pagination pages", page2.pagination.pages, 2);
  // Verify all items on page 2 have status='pending'
  page2.data.forEach((request, index) => {
    TestValidator.equals(
      `page 2 item ${index} status is pending`,
      request.status,
      "pending",
    );
  });
  // 9. Seller with after_date filter - exclude oldest request
  const oldestRequest = cancellationRequests[0];
  const afterDate = oldestRequest.created_at;
  const filteredPage =
    await api.functional.ecommerceMall.seller.seller.cancel_requests.pending.index(
      sellerConnection3,
      {
        body: {
          limit: 10,
          after_date: afterDate,
        },
      },
    );
  typia.assert(filteredPage);
  // Verify only 2 items returned (oldest excluded)
  TestValidator.equals(
    "after_date filter returns 2 items (excluding oldest)",
    filteredPage.data.length,
    2,
  );
  // Verify oldest request is NOT in the filtered results
  const foundOldest = filteredPage.data.some(
    (request) => request.id === oldestRequest.id,
  );
  TestValidator.notEquals(
    "oldest request excluded by after_date",
    foundOldest,
    true,
  );
  // Verify all filtered results are newer than afterDate
  filteredPage.data.forEach((request, index) => {
    TestValidator.predicate(
      `filtered item ${index} created after after_date`,
      request.created_at > afterDate,
    );
  });
  // Verify all filtered items have status='pending'
  filteredPage.data.forEach((request, index) => {
    TestValidator.equals(
      `filtered item ${index} status is pending`,
      request.status,
      "pending",
    );
  });
}
