import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_admin_shipment_search_by_order_and_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create first seller account
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  // 3. Create second seller account
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller2Auth);
  // 4. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 5. Use random category ID (since we don't have admin categories search)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 6. Create product for seller 1
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  // 7. Create variant for seller 1's product
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: {
          productId: product1.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(8)}`,
          optionValues: [
            { key: "color", value: "Red" },
          ] satisfies IEcommerceMallProductVariantOption[],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // 8. Create product for seller 2
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // 9. Create variant for seller 2's product
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller2Connection,
      {
        params: {
          productId: product2.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(8)}`,
          optionValues: [
            { key: "size", value: "Large" },
          ] satisfies IEcommerceMallProductVariantOption[],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 10. Customer adds items from both sellers to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant1.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant2.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 11. Customer places multi-seller order
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.name(),
        shipping_state: RandomGenerator.name(),
        shipping_postal_code: RandomGenerator.alphaNumeric(10),
        shipping_country: "South Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 12. First seller creates first shipment for order (using variant ID to filter)
  const shipment1 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      seller1Connection,
      {
        body: {
          trackingNumber: `TRK-${RandomGenerator.alphabets(10)}`,
          carrierName: "Korea Post",
          shippedAt: new Date().toISOString() satisfies string &
            tags.Format<"date-time">,
          orderItemIds: order.order_items
            .filter((item) => item.productVariant.sku_code === variant1.skuCode)
            .map((item) => item.id),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  // 13. First seller creates second shipment for same order (split shipment)
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      seller1Connection,
      {
        body: {
          trackingNumber: `TRK-${RandomGenerator.alphabets(10)}`,
          carrierName: "CJ Logistics",
          shippedAt: new Date().toISOString() satisfies string &
            tags.Format<"date-time">,
          orderItemIds: order.order_items
            .filter((item) => item.productVariant.sku_code === variant1.skuCode)
            .map((item) => item.id),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  // 14. Second seller creates shipment for order (using variant ID to filter)
  const shipment3 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      seller2Connection,
      {
        body: {
          trackingNumber: `TRK-${RandomGenerator.alphabets(10)}`,
          carrierName: "DHL",
          shippedAt: new Date().toISOString() satisfies string &
            tags.Format<"date-time">,
          orderItemIds: order.order_items
            .filter((item) => item.productVariant.sku_code === variant2.skuCode)
            .map((item) => item.id),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment3);
  // 15. Admin searches shipments by order number
  const searchByOrder =
    await api.functional.ecommerceMall.admin.shipments.search(adminConnection, {
      body: {
        orderNumber: order.order_number,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchByOrder);
  // Verify order number search returns all shipments for this order
  TestValidator.equals(
    "order number search returns all shipments",
    searchByOrder.data.length,
    3,
  );
  // 16. Admin searches shipments by seller 1 ID
  const searchBySeller1 =
    await api.functional.ecommerceMall.admin.shipments.search(adminConnection, {
      body: {
        sellerId: seller1Auth.seller.id,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchBySeller1);
  // Verify seller ID search returns only shipments from seller 1
  TestValidator.equals(
    "seller 1 search returns only seller 1's shipments",
    searchBySeller1.data.length,
    2,
  );
  TestValidator.predicate(
    "all shipments belong to seller 1",
    searchBySeller1.data.every(
      (shipment) => shipment.seller.id === seller1Auth.seller.id,
    ),
  );
  // 17. Admin searches shipments by seller 2 ID
  const searchBySeller2 =
    await api.functional.ecommerceMall.admin.shipments.search(adminConnection, {
      body: {
        sellerId: seller2Auth.seller.id,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchBySeller2);
  // Verify seller ID search returns only shipments from seller 2
  TestValidator.equals(
    "seller 2 search returns only seller 2's shipments",
    searchBySeller2.data.length,
    1,
  );
  TestValidator.predicate(
    "all shipments belong to seller 2",
    searchBySeller2.data.every(
      (shipment) => shipment.seller.id === seller2Auth.seller.id,
    ),
  );
  // 18. Admin searches shipments by order number AND seller 1 ID (combined filter)
  const searchCombined =
    await api.functional.ecommerceMall.admin.shipments.search(adminConnection, {
      body: {
        orderNumber: order.order_number,
        sellerId: seller1Auth.seller.id,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(searchCombined);
  // Verify combined filter returns only seller 1's shipments for the order
  TestValidator.equals(
    "combined filter returns correct shipments",
    searchCombined.data.length,
    2,
  );
  TestValidator.predicate(
    "all shipments belong to seller 1",
    searchCombined.data.every(
      (shipment) => shipment.seller.id === seller1Auth.seller.id,
    ),
  );
  // 19. Test pagination with seller ID filter
  const paginatedSearch =
    await api.functional.ecommerceMall.admin.shipments.search(adminConnection, {
      body: {
        sellerId: seller1Auth.seller.id,
        page: 1,
        limit: 1,
      } satisfies IEcommerceMallShipment.IRequest,
    });
  typia.assert(paginatedSearch);
  // Verify pagination works
  TestValidator.equals(
    "pagination returns 1 result",
    paginatedSearch.data.length,
    1,
  );
  TestValidator.equals(
    "pagination metadata is correct",
    paginatedSearch.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    paginatedSearch.pagination.pages,
    2,
  );
  // 20. Verify shipment summaries include seller information
  TestValidator.predicate(
    "shipment summary includes seller",
    searchByOrder.data.every((shipment) => shipment.seller !== null),
  );
  TestValidator.predicate(
    "shipment summary includes tracking number",
    searchByOrder.data.every(
      (shipment) =>
        shipment.tracking_number !== null &&
        shipment.tracking_number.length > 0,
    ),
  );
  TestValidator.predicate(
    "shipment summary includes carrier name",
    searchByOrder.data.every(
      (shipment) =>
        shipment.carrier_name !== null && shipment.carrier_name.length > 0,
    ),
  );
}
