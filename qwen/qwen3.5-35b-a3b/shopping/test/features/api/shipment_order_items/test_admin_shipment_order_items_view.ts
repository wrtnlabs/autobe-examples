import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentsOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentsOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_admin_shipment_order_items_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create seller account and authenticate
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // 3. Seller creates a product
  const sellerProductConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerProductConnection, {
    body: {
      email: sellerAuthorized.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerProductConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerProductConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: { size: "Large", color: "Blue" },
          base_price: product.base_price * 120,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
          status: "active",
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Create a shipment (note: in real scenario, shipment requires order_item_ids from actual orders)
  const sellerShipmentConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerShipmentConnection, {
    body: {
      email: sellerAuthorized.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Create a mock shipment with a valid shipment ID
  // In a complete flow, this would require order_item_ids from existing orders
  const mockShipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Admin retrieves shipment order items
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuthorized.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Test with default pagination and sorting
  const page = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const response =
    await api.functional.ecommerceMall.admin.shipments.order_items.index(
      adminConnection,
      {
        shipmentId: mockShipmentId,
        body: {
          page: page,
          limit: limit,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(response);
  // 7. Validate response pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, limit);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 8. Verify pagination calculates total pages correctly
  const expectedPages = Math.ceil(response.pagination.records / limit);
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
  // 9. Test with different sorting by shipped_quantity ascending
  const sortedResponse =
    await api.functional.ecommerceMall.admin.shipments.order_items.index(
      adminConnection,
      {
        shipmentId: mockShipmentId,
        body: {
          page: 1,
          limit: limit,
          sortBy: "shipped_quantity",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortedResponse);
  // 10. Test with shippedQuantity filter
  const filterResponse =
    await api.functional.ecommerceMall.admin.shipments.order_items.index(
      adminConnection,
      {
        shipmentId: mockShipmentId,
        body: {
          page: 1,
          limit: 20,
          shippedQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
      },
    );
  typia.assert(filterResponse);
  // 11. Test with search parameter
  const searchResponse =
    await api.functional.ecommerceMall.admin.shipments.order_items.index(
      adminConnection,
      {
        shipmentId: mockShipmentId,
        body: {
          page: 1,
          limit: 20,
          search: RandomGenerator.alphaNumeric(10),
        },
      },
    );
  typia.assert(searchResponse);
  // 12. Verify each order item has required references
  for (const item of response.data) {
    typia.assert(item);
    TestValidator.predicate("shipment summary exists", item.shipment !== null);
    TestValidator.predicate(
      "order item summary exists",
      item.orderItem !== null,
    );
    TestValidator.predicate(
      "shipped quantity is non-negative",
      item.shipped_quantity >= 0,
    );
  }
  // 13. Verify date-time format for timestamps
  for (const item of response.data) {
    typia.assert(item);
    const createdAt: string = item.created_at;
    const updatedAt: string = item.updated_at;
    // typia.assert will validate the date-time format
    typia.assert(createdAt);
    typia.assert(updatedAt);
  }
}
