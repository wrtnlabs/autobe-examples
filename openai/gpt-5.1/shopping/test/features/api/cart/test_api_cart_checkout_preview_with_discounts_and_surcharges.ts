import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartCheckoutPreview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreview";
import type { IShoppingMallCartCheckoutPreviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewItem";
import type { IShoppingMallCartCheckoutPreviewMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewMessage";
import type { IShoppingMallCartCheckoutPreviewTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewTotals";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCartValidationError } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationError";
import type { IShoppingMallCartValidationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationResult";
import type { IShoppingMallCartValidationWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationWarning";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurcharge";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_cart_checkout_preview_with_discounts_and_surcharges(
  connection: api.IConnection,
) {
  // 1. Join actors: customer, admin, seller
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
    ip: null,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  // 2. Admin setup: inventory state, payment method, surcharge, category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com",
      ip: null,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphabets(6)}`,
    name: "In Stock",
    description: "Purchasable inventory state for SKUs",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  const paymentMethodCode: string = `pm_${RandomGenerator.alphabets(8)}`;

  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Test Card with Surcharge",
    description: "Test payment method used for surcharge preview",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: "US",
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  const surchargeBody = {
    scope_code: "global",
    currency_code: "USD",
    min_order_amount: 0,
    max_order_amount: undefined,
    fixed_fee_amount: 2.5,
    percentage_fee_rate: 1.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode,
        body: surchargeBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(surcharge);

  const categoryBody = {
    parent_id: null,
    slug: `electronics_${RandomGenerator.alphabets(4)}`,
    name_en: "Electronics",
    description_en: "Electronics category for testing",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 3. Seller setup: product, product-category link, SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com",
      ip: null,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productBody = {
    code: `prd_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model X",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/product-test.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login2",
      referrer: "https://admin.example.com",
      ip: null,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller.example.com/login2",
      referrer: "https://seller.example.com",
      ip: null,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const skuBody = {
    code: `sku_${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10,
    low_stock_threshold: 1,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 4. Customer cart setup
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://customer.example.com/login",
      referrer: "https://customer.example.com",
      ip: null,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 2,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  const validation: IShoppingMallCartValidationResult =
    await api.functional.shoppingMall.customer.carts.validate(connection, {
      cartId: cart.id,
    });
  typia.assert<IShoppingMallCartValidationResult>(validation);

  TestValidator.predicate(
    "cart should be valid before checkout preview",
    validation.isValid,
  );
  TestValidator.equals(
    "no blocking errors before checkout",
    validation.blockingErrors.length,
    0,
  );

  // 5. Checkout preview
  const couponCode: string = `COUPON_${RandomGenerator.alphaNumeric(6)}`;

  const checkoutRequest = {
    payment_method_code: paymentMethodCode,
    coupon_codes: [couponCode],
    country_code: "US",
    region_code: "US-CA",
  } satisfies IShoppingMallCartCheckoutPreview.IRequest;

  const preview: IShoppingMallCartCheckoutPreview =
    await api.functional.shoppingMall.customer.carts.checkoutPreview.index(
      connection,
      {
        cartId: cart.id,
        body: checkoutRequest,
      },
    );
  typia.assert<IShoppingMallCartCheckoutPreview>(preview);

  // 6. Business assertions on preview
  const totals: IShoppingMallCartCheckoutPreviewTotals = preview.totals;
  const items: IShoppingMallCartCheckoutPreviewItem[] = preview.items;
  const messages: IShoppingMallCartCheckoutPreviewMessage[] | undefined =
    preview.messages;

  TestValidator.predicate(
    "checkout should be allowed in preview",
    preview.allowed_to_checkout,
  );

  TestValidator.predicate(
    "preview should have at least one item",
    items.length > 0,
  );

  for (const item of items) {
    TestValidator.predicate(
      "each preview item has non-negative discount_amount",
      item.discount_amount >= 0,
    );
    TestValidator.predicate(
      "each preview item has non-negative tax_amount",
      item.tax_amount >= 0,
    );
    if (item.shipping_fee_share !== undefined) {
      TestValidator.predicate(
        "shipping_fee_share is non-negative when present",
        item.shipping_fee_share >= 0,
      );
    }
    if (item.surcharge_share !== undefined) {
      TestValidator.predicate(
        "surcharge_share is non-negative when present",
        item.surcharge_share >= 0,
      );
    }
    TestValidator.predicate(
      "line_total is non-negative for each item",
      item.line_total >= 0,
    );
  }

  TestValidator.predicate(
    "subtotal should be non-negative",
    totals.subtotal >= 0,
  );
  TestValidator.predicate(
    "discount_total should be non-negative",
    totals.discount_total >= 0,
  );
  TestValidator.predicate(
    "tax_total should be non-negative",
    totals.tax_total >= 0,
  );
  TestValidator.predicate(
    "shipping_total should be non-negative",
    totals.shipping_total >= 0,
  );
  TestValidator.predicate(
    "surcharge_total should be non-negative",
    totals.surcharge_total >= 0,
  );
  TestValidator.predicate(
    "payable_total should be non-negative",
    totals.payable_total >= 0,
  );

  TestValidator.predicate(
    "surcharge_total should be positive when surcharge is configured",
    totals.surcharge_total > 0,
  );

  const reconstructedPayable =
    totals.subtotal -
    totals.discount_total +
    totals.tax_total +
    totals.shipping_total +
    totals.surcharge_total;

  const epsilon = 0.01;
  TestValidator.predicate(
    "payable_total should approximately equal subtotal - discount + tax + shipping + surcharge",
    Math.abs(reconstructedPayable - totals.payable_total) <= epsilon,
  );

  if (messages !== undefined && messages.length > 0) {
    for (const msg of messages) {
      TestValidator.notEquals(
        "no error-level messages in checkout preview",
        msg.level,
        "error",
      );
    }
  }
}
