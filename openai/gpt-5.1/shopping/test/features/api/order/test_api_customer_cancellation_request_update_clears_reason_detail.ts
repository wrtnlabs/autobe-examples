import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_customer_cancellation_request_update_clears_reason_detail(
  connection: api.IConnection,
) {
  // 0. Helper values for URLs and emails
  const baseHref = "https://customer.example.com/join" as const;
  const baseReferrer = "https://customer.example.com/landing" as const;
  const adminHref = "https://admin.example.com/join" as const;
  const adminReferrer = "https://admin.example.com/landing" as const;

  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: "AdminPassword!234",
    href: adminHref,
    referrer: adminReferrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. Create category tree (not strictly required, but part of realistic setup)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  // 3. Create brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create product (using a synthetic seller id)
  const syntheticSellerId = typia.random<string & tags.Format<"uuid">>();

  const productBody = {
    shopping_mall_seller_id: syntheticSellerId,
    shopping_mall_brand_id: brand.id,
    code: `prd-${RandomGenerator.alphaNumeric(8)}`,
    name: `Test Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  // 5. Create SKU under the product code
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: `Variant ${RandomGenerator.name(1)}`,
    listPrice: 100,
    salePrice: 100,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 6. Customer joins (self-registration)
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: "CustomerPassword!234",
    name: RandomGenerator.name(),
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 7. Create a customer cart
  const customerCartBody = {
    currency_code: "USD",
    region_code: "US-test-region",
    channel: "web",
    metadata: {
      campaign: "cxl-reason-detail-test",
    },
    is_active: true,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartBody,
      },
    );
  typia.assert(customerCart);

  // 8. Add SKU to the cart as an item
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 9. Create an order from the cart
  const orderCurrency = customerCart.currency_code;

  const orderItemsSubtotal = 100;
  const orderDiscountTotal = 0;
  const orderShippingTotal = 0;
  const orderTaxTotal = 0;
  const orderGrandTotal =
    orderItemsSubtotal -
    orderDiscountTotal +
    orderShippingTotal +
    orderTaxTotal;

  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: orderCurrency,
    items_subtotal_amount: orderItemsSubtotal,
    discount_total_amount: orderDiscountTotal,
    shipping_total_amount: orderShippingTotal,
    tax_total_amount: orderTaxTotal,
    grand_total_amount: orderGrandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 10. Create initial cancellation request with category and detail
  const initialReasonCategory = "changed_mind";
  const initialReasonDetail = RandomGenerator.paragraph({ sentences: 4 });

  const cancellationCreateBody = {
    request_reason_category: initialReasonCategory,
    request_reason_detail: initialReasonDetail,
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const createdCancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert(createdCancellation);

  // 11. Update cancellation request with explicit null detail
  const cancellationUpdateBody = {
    request_reason_detail: null,
  } satisfies IShoppingMallOrderCancellationRequest.IUpdate;

  const updatedCancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.update(
      connection,
      {
        orderId: order.id,
        cancellationRequestId: createdCancellation.id,
        body: cancellationUpdateBody,
      },
    );
  typia.assert(updatedCancellation);

  // 12. Business assertions
  TestValidator.equals(
    "cancellation id remains the same",
    updatedCancellation.id,
    createdCancellation.id,
  );

  TestValidator.equals(
    "cancellation order reference remains the same",
    updatedCancellation.order.id,
    createdCancellation.order.id,
  );

  TestValidator.equals(
    "cancellation reason category remains unchanged",
    updatedCancellation.request_reason_category,
    createdCancellation.request_reason_category,
  );

  TestValidator.equals(
    "cancellation reason detail is cleared to null",
    updatedCancellation.request_reason_detail,
    null,
  );

  TestValidator.equals(
    "cancellation actor type remains unchanged",
    updatedCancellation.actor_type,
    createdCancellation.actor_type,
  );

  TestValidator.equals(
    "cancellation created_at is immutable",
    updatedCancellation.created_at,
    createdCancellation.created_at,
  );
}
