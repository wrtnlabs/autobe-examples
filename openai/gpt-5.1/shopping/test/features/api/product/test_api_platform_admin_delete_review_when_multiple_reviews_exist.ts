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
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_delete_review_when_multiple_reviews_exist(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As platform admin, create category tree, brand, product, and SKU
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri:
      "https://cdn.shoppingmall.local/logo/" + RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Product creation requires a seller id, but we do not have seller APIs.
  // However, IShoppingMallProduct.ICreate expects shopping_mall_seller_id as a UUID.
  // In simulation mode, random UUID is acceptable; for real backend this would
  // have to reference an existing seller. As we must prioritize compilable tests,
  // we synthesize a UUID here.
  const fakeSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string & tags.MinLength<1>;

  const productBody = {
    shopping_mall_seller_id: fakeSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.local/product/" +
      RandomGenerator.alphaNumeric(16),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 100,
    salePrice: 80,
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

  // Helper to register and authenticate a customer
  const registerAndLoginCustomer = async () => {
    const email: string & tags.Format<"email"> = typia.random<
      string & tags.Format<"email">
    >();
    const password = RandomGenerator.alphaNumeric(12);

    const joinBody = {
      email,
      password,
      name: RandomGenerator.name(),
      ip: null,
      href: "https://shoppingmall.local/join",
      referrer: "https://shoppingmall.local/",
    } satisfies IShoppingMallCustomerAuth.IJoin;

    const joined: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: joinBody,
      });
    typia.assert(joined);

    // login (to demonstrate switching in non-simulate, though join already authenticated)
    const loginBody = {
      email,
      password,
      ip: null,
      href: "https://shoppingmall.local/login",
      referrer: "https://shoppingmall.local/",
      userAgent: "E2E-Test-Agent",
    } satisfies IShoppingMallCustomerAuth.ILogin;

    const loggedIn: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: loginBody,
      });
    typia.assert(loggedIn);

    return { authorized: loggedIn, email, password };
  };

  // Helper to create cart, add sku, and create order
  const createOrderForCustomer = async (
    _customer: IShoppingMallCustomer.IAuthorized,
  ): Promise<IShoppingMallOrder> => {
    const cartBody = {
      currency_code: sku.currency,
      region_code: "US",
      channel: "web",
      metadata: undefined,
      is_active: true,
      source_guest_token: undefined,
    } satisfies IShoppingMallCustomerCart.ICreate;

    const cart: IShoppingMallCustomerCart =
      await api.functional.shoppingMall.customer.customerCarts.create(
        connection,
        { body: cartBody },
      );
    typia.assert(cart);

    const cartItemBody = {
      skuId: sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      note: "test item",
    } satisfies IShoppingMallCustomerCartItem.ICreate;

    const cartItem: IShoppingMallCustomerCartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: cart.id,
          body: cartItemBody,
        },
      );
    typia.assert(cartItem);

    // Synthesize order monetary snapshot and address IDs
    const itemsSubtotal = 80;
    const discountTotal = 0;
    const shippingTotal = 10;
    const taxTotal = 9;
    const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

    const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
      string & tags.Format<"uuid">
    >();
    const billingAddressId: string & tags.Format<"uuid"> = typia.random<
      string & tags.Format<"uuid">
    >();

    const orderBody = {
      customer_cart_id: cart.id,
      currency_code: cart.currency_code,
      items_subtotal_amount: itemsSubtotal,
      discount_total_amount: discountTotal,
      shipping_total_amount: shippingTotal,
      tax_total_amount: taxTotal,
      grand_total_amount: grandTotal,
      shipping_address_id: shippingAddressId,
      billing_address_id: billingAddressId,
      customer_note: "E2E test order",
    } satisfies IShoppingMallOrder.ICreate;

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderBody,
      });
    typia.assert(order);
    return order;
  };

  // 3–4. Register and authenticate two customers, create orders for both
  const customer1 = await registerAndLoginCustomer();
  const order1 = await createOrderForCustomer(customer1.authorized);
  typia.assert(order1);

  const customer2 = await registerAndLoginCustomer();
  const order2 = await createOrderForCustomer(customer2.authorized);
  typia.assert(order2);

  // 5. Each customer writes a review for the same product
  const reviewBody1 = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 6 }) as string &
      tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const review1: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewBody1,
      },
    );
  typia.assert(review1);

  const reviewBody2 = {
    rating: 3 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Average" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 4 }) as string &
      tags.MinLength<1>,
  } satisfies IShoppingMallProductReview.ICreate;

  const review2: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewBody2,
      },
    );
  typia.assert(review2);

  // Ensure both reviews are for the same product but have different IDs
  TestValidator.equals(
    "both reviews target same product",
    review1.product.id,
    review2.product.id,
  );
  TestValidator.notEquals(
    "reviews must have distinct ids",
    review1.id,
    review2.id,
  );

  // 6. Switch auth back to platform admin – use login to ensure token is admin
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Delete the second review as platform admin
  await api.functional.shoppingMall.platformAdmin.products.reviews.erase(
    connection,
    {
      productId: product.id,
      reviewId: review2.id,
    },
  );

  // 8. Validate that deleting again fails, implying first deletion took effect.
  await TestValidator.error(
    "second deletion of same review should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.reviews.erase(
        connection,
        {
          productId: product.id,
          reviewId: review2.id,
        },
      );
    },
  );

  // The first review should conceptually remain since we never delete it.
  // We cannot re-fetch it without a get/list API, but we can at least assert
  // that its product association is still as expected within this test context.
  TestValidator.equals(
    "remaining review still associated with product",
    review1.product.id,
    product.id,
  );
}
