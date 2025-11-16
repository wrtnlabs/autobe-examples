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

export async function test_api_customer_cancellation_request_detail_access_control_by_customer(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform admin and stay authenticated as platform admin for catalog setup
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: `Admin ${RandomGenerator.name(1)}`,
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. Create minimal catalog: category tree, brand, product, sku
  const categoryTreeBody = {
    code: `cat-tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Test Category Tree",
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

  const brandBody = {
    name: `Test Brand ${RandomGenerator.alphabets(5)}`,
    slug: `test-brand-${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: `https://cdn.example.com/logo/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = `PROD-${RandomGenerator.alphaNumeric(10)}`;

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Test Product ${RandomGenerator.alphabets(6)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: `https://cdn.example.com/product/${RandomGenerator.alphaNumeric(10)}`,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: `Variant ${RandomGenerator.alphabets(4)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
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

  // 3. Create Customer A and perform order + cancellation flow as Customer A
  const customerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerAJoinBody = {
    email: customerAEmail,
    password: "CustomerAPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuth);

  const cartABody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartABody,
      },
    );
  typia.assert(cartA);

  const cartItemABody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test line item for cancellation request access control",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemA: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartA.id,
        body: cartItemABody,
      },
    );
  typia.assert(cartItemA);

  const itemsSubtotal = 9000;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderABody = {
    customer_cart_id: cartA.id,
    currency_code: "KRW",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please cancel this order in test scenario",
  } satisfies IShoppingMallOrder.ICreate;

  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderABody,
    });
  typia.assert(orderA);

  const cancellationCreateBody = {
    request_reason_category: "changed_mind",
    request_reason_detail:
      "Customer A created this request for access control test.",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellationA: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: orderA.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert(cancellationA);

  const cancellationDetailA: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.at(
      connection,
      {
        orderId: orderA.id,
        cancellationRequestId: cancellationA.id,
      },
    );
  typia.assert(cancellationDetailA);

  TestValidator.equals(
    "customer A can see own cancellation request",
    cancellationDetailA.id,
    cancellationA.id,
  );
  TestValidator.equals(
    "cancellation request order id matches order A id",
    cancellationDetailA.order.id,
    orderA.id,
  );
  TestValidator.equals(
    "cancellation actor type is customer for customer A",
    cancellationDetailA.actor_type,
    "customer",
  );

  // 4. Create Customer B and ensure it cannot access Customer A's cancellation request
  const customerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerBJoinBody = {
    email: customerBEmail,
    password: "CustomerBPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuth);

  const customerBLoginBody = {
    email: customerBEmail,
    password: "CustomerBPass123!",
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerBLoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(customerBLoginAuth);

  await TestValidator.error(
    "customer B cannot access customer A cancellation request",
    async () => {
      await api.functional.shoppingMall.customer.orders.cancellationRequests.at(
        connection,
        {
          orderId: orderA.id,
          cancellationRequestId: cancellationA.id,
        },
      );
    },
  );
}
