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

/**
 * Validate that a logged-in customer can update a pending cancellation request
 * for their own order.
 *
 * Business flow:
 *
 * 1. Platform admin joins and logs in to obtain platformAdmin auth context.
 * 2. Platform admin creates a category tree and a brand for catalog completeness.
 * 3. Platform admin creates a product and a SKU under that product.
 * 4. Customer joins and logs in to obtain customer auth context.
 * 5. Customer creates a persistent customer cart.
 * 6. Customer adds the created SKU as a cart item.
 * 7. Customer creates an order from the cart.
 * 8. Customer creates an initial cancellation request for that order (pending).
 * 9. Customer updates the cancellation request reason category and detail.
 * 10. Validate that mutable fields are updated while identity and linkage remain
 *     stable.
 */
export async function test_api_customer_cancellation_request_update_pending_order(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin login (explicit, to mimic real-world actor switching patterns)
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 3. Create category tree
  const categoryTreeCreateBody = {
    code: `ct-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // 4. Create brand
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 5. Create product (using random seller id because seller creation is out of scope here)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productCode = `prd-${RandomGenerator.alphaNumeric(10)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // 6. Create SKU under the product
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 7. Customer join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 8. Customer login (for clarity, though join already authenticates)
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/join",
    userAgent: "autobe-e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 9. Create customer cart
  const customerCartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      scenario: "cancellation-update",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: customerCartCreateBody },
    );
  typia.assert(customerCart);

  // 10. Add SKU as cart item
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
    note: "test item for cancellation update",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 11. Create an order from the cart
  const orderCreateBodyBase: IShoppingMallOrder.ICreate =
    typia.random<IShoppingMallOrder.ICreate>();

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    ...orderCreateBodyBase,
    customer_cart_id: customerCart.id,
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 12. Create an initial cancellation request for the order
  const cancellationCreateBody =
    typia.random<IShoppingMallOrderCancellationRequest.ICreate>();

  const initialCancellationRequest: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert(initialCancellationRequest);

  // 13. Update the cancellation request with new reason values
  const updatedReasonCategory = "changed_mind";
  const updatedReasonDetail = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    request_reason_category: updatedReasonCategory,
    request_reason_detail: updatedReasonDetail,
  } satisfies IShoppingMallOrderCancellationRequest.IUpdate;

  const updatedCancellationRequest: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.update(
      connection,
      {
        orderId: order.id,
        cancellationRequestId: initialCancellationRequest.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCancellationRequest);

  // 14. Business assertions
  TestValidator.equals(
    "cancellation request id preserved after update",
    updatedCancellationRequest.id,
    initialCancellationRequest.id,
  );

  TestValidator.equals(
    "cancellation request still linked to same order",
    updatedCancellationRequest.order.id,
    order.id,
  );

  TestValidator.equals(
    "request_reason_category updated",
    updatedCancellationRequest.request_reason_category,
    updatedReasonCategory,
  );

  TestValidator.equals(
    "request_reason_detail updated",
    updatedCancellationRequest.request_reason_detail,
    updatedReasonDetail,
  );

  TestValidator.predicate(
    "cancellation request status remains non-empty",
    updatedCancellationRequest.request_status.length > 0,
  );

  const createdAt = new Date(updatedCancellationRequest.created_at).getTime();
  const updatedAt = new Date(updatedCancellationRequest.updated_at).getTime();

  TestValidator.predicate(
    "updated_at is not before created_at",
    updatedAt >= createdAt,
  );
}
