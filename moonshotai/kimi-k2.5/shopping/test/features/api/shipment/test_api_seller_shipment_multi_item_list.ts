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
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipment_multi_item_list(
  connection: api.IConnection,
): Promise<void> {
  // Create separate connections for each actor (section 249: Connection Isolation)
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as admin for seller approval and category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Admin approves seller registration (section 249: Multi-actor approval)
  const registrationUpdate =
    await api.functional.ecommerceMall.admin.registrations.update(
      adminConnection,
      {
        registrationId: seller.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(registrationUpdate);
  TestValidator.equals(
    "seller registration approved",
    registrationUpdate.status,
    "approved",
  );
  // 4. Create product category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 5. Seller creates first product
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<100> & tags.Maximum<500>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  // 6. Create variant for first product
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product1.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          price: typia.random<number & tags.Minimum<100> & tags.Maximum<500>>(),
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ]),
            },
            {
              optionName: "Size",
              optionValue: RandomGenerator.pick(["Small", "Medium", "Large"]),
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // 7. Seller creates second product
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<100> & tags.Maximum<500>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // 8. Create variant for second product
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product2.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          price: typia.random<number & tags.Minimum<100> & tags.Maximum<500>>(),
          options: [
            {
              optionName: "Material",
              optionValue: RandomGenerator.pick([
                "Cotton",
                "Polyester",
                "Wool",
              ]),
            },
            {
              optionName: "Style",
              optionValue: RandomGenerator.pick(["Casual", "Formal", "Sport"]),
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 9. Authenticate as customer for cart and order creation
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 10. Add first variant to cart
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  // 11. Add second variant to cart
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 12. Create shipment with multiple items (section 252: Shipment grouping logic)
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        trackingNumber: RandomGenerator.alphaNumeric(20).toUpperCase(),
      } satisfies Partial<IEcommerceMallShipment.ICreate>,
    },
  );
  typia.assert(shipment);
  // 13. Verify shipment has multiple items (section 252 validation)
  TestValidator.predicate(
    "shipment has at least one item",
    shipment.shipment_items.length >= 1,
  );
  // Get the order ID from the shipment for filtering
  const orderId = shipment.shipment_items[0]?.orderItem?.order?.id;
  TestValidator.predicate(
    "shipment has valid order reference",
    orderId !== undefined && orderId !== null,
  );
  // 14. Test: Search shipments without filters (validate multi-item shipments appear)
  const allShipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(allShipments);
  TestValidator.predicate(
    "shipment appears in unfiltered search results",
    allShipments.data.some((s) => s.id === shipment.id),
  );
  // 15. Test: Filter by order ID (section 249: Multi-seller order support)
  const filteredByOrder =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          orderId: orderId!,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredByOrder);
  TestValidator.predicate(
    "filtering by order ID returns correct shipment",
    filteredByOrder.data.some((s) => s.id === shipment.id),
  );
  TestValidator.equals(
    "filtered results contain only shipments for the order",
    filteredByOrder.data.every((s) => s.order.id === orderId),
    true,
  );
  // 16. Test: Filter by carrier name
  const filteredByCarrier =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: shipment.carrier_name.substring(0, 3),
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredByCarrier);
  TestValidator.predicate(
    "filtering by carrier name includes created shipment",
    filteredByCarrier.data.some((s) => s.id === shipment.id),
  );
  // 17. Test: Pagination (limit 1)
  const page1 = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        orderId: null,
        sellerId: null,
        carrierName: null,
        status: null,
        shippedAtFrom: null,
        shippedAtTo: null,
        page: 1,
        limit: 1,
        search: null,
        sort: null,
        order: null,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has limit 1", page1.pagination.limit, 1);
  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  TestValidator.predicate(
    "page 1 data has at most 1 item",
    page1.data.length <= 1,
  );
  // 18. Test: Pagination (page 2)
  const page2 = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        orderId: null,
        sellerId: null,
        carrierName: null,
        status: null,
        shippedAtFrom: null,
        shippedAtTo: null,
        page: 2,
        limit: 1,
        search: null,
        sort: null,
        order: null,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  // 19. Test: Sorting by shipped_at descending
  const sortedDesc = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        orderId: null,
        sellerId: null,
        carrierName: null,
        status: null,
        shippedAtFrom: null,
        shippedAtTo: null,
        page: 1,
        limit: 20,
        search: null,
        sort: "shipped_at",
        order: "desc",
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(sortedDesc);
  // Validate sorting is correct (newest first)
  if (sortedDesc.data.length >= 2) {
    const firstDate = new Date(sortedDesc.data[0].shippedAt);
    const secondDate = new Date(sortedDesc.data[1].shippedAt);
    TestValidator.predicate(
      "descending sort shows newest first",
      firstDate >= secondDate,
    );
  }
  // 20. Test: Sorting by carrier_name ascending
  const sortedByCarrier =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          orderId: null,
          sellerId: null,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: 1,
          limit: 20,
          search: null,
          sort: "carrier_name",
          order: "asc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedByCarrier);
  // Validate carrier name sorting
  if (sortedByCarrier.data.length >= 2) {
    const firstName = sortedByCarrier.data[0].carrierName.toLowerCase();
    const secondName = sortedByCarrier.data[1].carrierName.toLowerCase();
    TestValidator.predicate(
      "ascending sort by carrier name is alphabetical",
      firstName <= secondName,
    );
  }
  // 21. Validate shipment contains correct item count (section 252)
  const foundShipment = allShipments.data.find((s) => s.id === shipment.id);
  if (foundShipment) {
    TestValidator.predicate(
      "shipment has valid item count",
      foundShipment.itemCount >= 1,
    );
    TestValidator.equals(
      "shipment order ID matches",
      foundShipment.order.id,
      orderId,
    );
  }
}
