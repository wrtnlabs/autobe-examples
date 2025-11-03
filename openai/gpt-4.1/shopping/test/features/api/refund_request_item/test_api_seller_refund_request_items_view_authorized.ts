import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundRequestItem";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import type { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import type { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import type { IShoppingOrderLineFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLineFulfillment";
import type { IShoppingOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderPaymentAttempt";
import type { IShoppingOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderShipment";
import type { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingRefundActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundActor";
import type { IShoppingRefundAdminOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAdminOverride";
import type { IShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundApproval";
import type { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import type { IShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequest";
import type { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import type { IShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundStatusHistory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

export async function test_api_seller_refund_request_items_view_authorized(
  connection: api.IConnection,
) {
  // 1. Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "s3llerpw",
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      },
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri:
      "https://cdn.example.com/product/" +
      RandomGenerator.alphaNumeric(12) +
      ".jpg",
    status: "draft",
    business_status: "in_review",
    shipping_weight_grams: 100,
    shipping_length_cm: 20,
    shipping_width_cm: 15,
    shipping_height_cm: 5,
    shipping_options: "standard",
  } satisfies IShoppingProduct.ICreate;
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Seller creates two SKUs
  const variantsA = [RandomGenerator.alphaNumeric(4)];
  const variantsB = [RandomGenerator.alphaNumeric(4)];
  const skuA: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        price: 9900,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: variantsA,
      },
    });
  typia.assert(skuA);
  const skuB: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        price: 11900,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: variantsB,
      },
    });
  typia.assert(skuB);

  // 4. Register customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "cust0mpwrd1",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://frontend.test/join",
        referrer: "https://frontend.test/landing",
        ip: null,
      },
    });
  typia.assert(customer);

  // 5. Customer creates order for both SKUs (qty 2 each)
  const shippingAddress = {
    type: "shipping",
    recipient_name: customer.name,
    recipient_phone: customer.phone,
    zip_code: "12345",
    base_address: RandomGenerator.paragraph({ sentences: 2 }),
    detail_address: null,
    city: "Seoul",
    state_province: "Seoul",
    country: "South Korea",
  } satisfies IShoppingOrderAddress.ICreate;
  const orderBody = {
    total_price: skuA.price * 2 + skuB.price * 2,
    order_lines: [
      {
        shopping_sku_id: skuA.id,
        quantity: 2,
        unit_price: skuA.price,
      },
      {
        shopping_sku_id: skuB.id,
        quantity: 2,
        unit_price: skuB.price,
      },
    ],
    shipping_addresses: [shippingAddress],
    payment_method: "account",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 6. Customer initiates refund request for both SKUs (qty 1 each)
  const refundBody = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: "partial return for test",
    items: order.order_lines.map((line) => ({
      shopping_order_id: order.id,
      shopping_order_line_id: line.id,
      quantity: 1,
      item_business_reason: `Refund test for SKU ${line.sku.sku_code}`,
      attachments: [],
    })),
    attachments: [],
  } satisfies IShoppingRefundRequest.ICreate;
  const refund: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: refundBody,
    });
  typia.assert(refund);

  // 7. Seller fetches all refund items (no filter)
  {
    const result = await api.functional.shopping.seller.refunds.items.index(
      connection,
      {
        refundRequestId: refund.id,
        body: {},
      },
    );
    typia.assert(result);
    TestValidator.equals(
      "refund request items match refund created items",
      result.data.length,
      refund.items.length,
    );
    // Validate all items belong to the right SKUs/lines
    for (const item of result.data) {
      TestValidator.predicate(
        `item belongs to requested order lines`,
        order.order_lines.some((ol) => ol.id === item.order_line_id),
      );
    }
  }

  // 8. Seller fetches items with filtering by sku_code of first SKU
  {
    const skuCode = order.order_lines[0].sku.sku_code;
    const result = await api.functional.shopping.seller.refunds.items.index(
      connection,
      {
        refundRequestId: refund.id,
        body: { sku_code: skuCode },
      },
    );
    typia.assert(result);
    TestValidator.predicate(
      "filtered items are for requested SKU",
      result.data.every((item) => {
        const ol = order.order_lines.find((ol) => ol.id === item.order_line_id);
        return !!ol && ol.sku.sku_code === skuCode;
      }),
    );
  }

  // 9. Seller fetches items with pagination (limit 1, page 1)
  {
    const result = await api.functional.shopping.seller.refunds.items.index(
      connection,
      {
        refundRequestId: refund.id,
        body: { limit: 1, page: 1 },
      },
    );
    typia.assert(result);
    TestValidator.equals(
      "pagination: page size respected",
      result.data.length,
      1,
    );
  }

  // 10. Negative scenario: fetch refund items for a refund unrelated to the seller (create new seller/customer/refund)
  {
    // Another seller
    const otherSeller: IShoppingSeller.IAuthorized =
      await api.functional.auth.seller.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "othersellerpw",
          display_name: RandomGenerator.name(),
          contact_phone: RandomGenerator.mobile(),
          status: "pending",
        },
      });
    typia.assert(otherSeller);
    const unrelatedProduct: IShoppingProduct =
      await api.functional.shopping.seller.products.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          main_image_uri:
            "https://cdn.example.com/product/" +
            RandomGenerator.alphaNumeric(12) +
            ".jpg",
          status: "draft",
          business_status: "in_review",
          shipping_weight_grams: 100,
          shipping_length_cm: 20,
          shipping_width_cm: 15,
          shipping_height_cm: 5,
          shipping_options: "standard",
        },
      });
    typia.assert(unrelatedProduct);
    const unrelatedSku: IShoppingSku =
      await api.functional.shopping.seller.products.skus.create(connection, {
        productCode: unrelatedProduct.code,
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          price: 12300,
          is_active: true,
          barcode: null,
          status: "in_stock",
          variant_attribute_value_ids: [RandomGenerator.alphaNumeric(4)],
        },
      });
    typia.assert(unrelatedSku);
    const otherCustomer: IShoppingCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "custtestpw",
          name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          href: "https://frontend.other/join",
          referrer: "https://frontend.other/landing",
          ip: null,
        },
      });
    typia.assert(otherCustomer);
    const unrelatedOrder: IShoppingOrder =
      await api.functional.shopping.customer.orders.create(connection, {
        body: {
          total_price: unrelatedSku.price * 1,
          order_lines: [
            {
              shopping_sku_id: unrelatedSku.id,
              quantity: 1,
              unit_price: unrelatedSku.price,
            },
          ],
          shipping_addresses: [
            {
              type: "shipping",
              recipient_name: otherCustomer.name,
              recipient_phone: otherCustomer.phone,
              zip_code: "54321",
              base_address: RandomGenerator.paragraph({ sentences: 2 }),
              detail_address: null,
              city: "Busan",
              state_province: "Busan",
              country: "South Korea",
            },
          ],
          payment_method: "account",
          coupon_code: null,
        },
      });
    typia.assert(unrelatedOrder);
    const unrelatedRefund: IShoppingRefundRequest =
      await api.functional.shopping.customer.refunds.create(connection, {
        body: {
          shopping_order_id: unrelatedOrder.id,
          request_type: "refund",
          business_reason: "Non-owned refund",
          items: [
            {
              shopping_order_id: unrelatedOrder.id,
              shopping_order_line_id: unrelatedOrder.order_lines[0].id,
              quantity: 1,
              item_business_reason: "Unrelated item refund",
              attachments: [],
            },
          ],
          attachments: [],
        },
      });
    typia.assert(unrelatedRefund);
    // Main seller attempts to fetch unrelated refund items
    const deniedResult =
      await api.functional.shopping.seller.refunds.items.index(connection, {
        refundRequestId: unrelatedRefund.id,
        body: {},
      });
    typia.assert(deniedResult);
    TestValidator.equals(
      "unrelated refund items list is empty or inaccessible",
      deniedResult.data.length,
      0,
    );
  }
}
