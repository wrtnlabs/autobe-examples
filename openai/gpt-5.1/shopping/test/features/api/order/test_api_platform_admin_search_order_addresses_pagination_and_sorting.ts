import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderAddress";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_platform_admin_search_order_addresses_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass!234",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoin);

  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "AdminPass!234",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 2. Register seller and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass!234",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass!234",
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3. Register customer and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass!234",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoin);

  const customerLoginBody = {
    email: customerEmail,
    password: "CustomerPass!234",
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 4. As platform admin, create catalog: category tree, brand, product, sku
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
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

  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // Use seller id from seller authorization as owner
  const sellerId = sellerJoin.id;
  const productCode = `prd-${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: "Test Product for Address Pagination" as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: "Default SKU",
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
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 5. As seller, create inventory item for SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 10,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);

  // 6. As customer, create cart and add item
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: { source: "e2e-test" },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 2,
    note: "Test cart item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 7. Create order from cart (minimal but consistent monetary snapshot)
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const itemsSubtotal = cart.subtotal_amount;
  const discountTotal = cart.discount_amount;
  const shippingTotal = cart.shipping_amount;
  const taxTotal = cart.tax_amount;
  const grandTotal = cart.total_amount;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 8. Create multiple order address snapshots for that order
  const orderId = order.id;
  const createdAddresses: IShoppingMallOrderAddress[] = [];

  const addressPayloads: IShoppingMallOrderAddress.ICreate[] = [
    {
      address_type: "shipping",
      recipient_name: "Alice One",
      street_line1: "123 Main St",
      street_line2: "Apt 1",
      city: "CityA",
      region: "RegionA",
      postal_code: "11111",
      country_code: "US",
      phone_number: RandomGenerator.mobile(),
    },
    {
      address_type: "billing",
      recipient_name: "Bob Two",
      street_line1: "456 Second St",
      street_line2: "Suite 200",
      city: "CityB",
      region: "RegionB",
      postal_code: "22222",
      country_code: "US",
      phone_number: RandomGenerator.mobile(),
    },
    {
      address_type: "shipping",
      recipient_name: "Carol Three",
      street_line1: "789 Third St",
      street_line2: null,
      city: "CityC",
      region: "RegionC",
      postal_code: "33333",
      country_code: "US",
      phone_number: RandomGenerator.mobile(),
    },
    {
      address_type: "billing",
      recipient_name: "Dave Four",
      street_line1: "1011 Fourth St",
      street_line2: "Floor 4",
      city: "CityD",
      region: "RegionD",
      postal_code: "44444",
      country_code: "US",
      phone_number: RandomGenerator.mobile(),
    },
    {
      address_type: "shipping",
      recipient_name: "Eve Five",
      street_line1: "1213 Fifth St",
      street_line2: "",
      city: "CityE",
      region: "RegionE",
      postal_code: "55555",
      country_code: "US",
      phone_number: RandomGenerator.mobile(),
    },
  ];

  for (const body of addressPayloads) {
    const addr: IShoppingMallOrderAddress =
      await api.functional.shoppingMall.orders.addresses.create(connection, {
        orderId,
        body,
      });
    typia.assert(addr);
    createdAddresses.push(addr);
  }

  TestValidator.equals(
    "created address count should be 5",
    createdAddresses.length,
    5,
  );

  const createdIds = createdAddresses.map((a) => a.id);

  // 9. As platform admin, query addresses with pagination & sorting
  const limitAsc = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const reqAscPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limitAsc,
    sort_by: "created_at",
    sort_direction: "asc" as const,
    address_type: undefined,
    country_code: undefined,
    postal_code: undefined,
    recipient_name: undefined,
    include_deleted: false,
  } satisfies IShoppingMallOrderAddress.IRequest;

  const ascPage1: IPageIShoppingMallOrderAddress.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.addresses.index(
      connection,
      {
        orderId,
        body: reqAscPage1,
      },
    );
  typia.assert(ascPage1);

  const reqAscPage2 = {
    ...reqAscPage1,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrderAddress.IRequest;
  const ascPage2: IPageIShoppingMallOrderAddress.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.addresses.index(
      connection,
      {
        orderId,
        body: reqAscPage2,
      },
    );
  typia.assert(ascPage2);

  const reqAscPage3 = {
    ...reqAscPage1,
    page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrderAddress.IRequest;
  const ascPage3: IPageIShoppingMallOrderAddress.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.addresses.index(
      connection,
      {
        orderId,
        body: reqAscPage3,
      },
    );
  typia.assert(ascPage3);

  const ascPages = [ascPage1, ascPage2, ascPage3];
  for (const [index, page] of ascPages.entries()) {
    const expectedCurrent = index as number &
      tags.Type<"int32"> &
      tags.Minimum<0>;
    TestValidator.equals(
      `asc page ${index + 1} pagination.limit matches`,
      page.pagination.limit,
      limitAsc,
    );
    TestValidator.equals(
      `asc page ${index + 1} pagination.current matches`,
      page.pagination.current,
      expectedCurrent,
    );
    TestValidator.equals(
      `asc page ${index + 1} pagination.records is 5`,
      page.pagination.records,
      5,
    );
    TestValidator.equals(
      `asc page ${index + 1} pagination.pages is 3`,
      page.pagination.pages,
      3,
    );

    TestValidator.predicate(
      `asc page ${index + 1} data length within limit`,
      page.data.length <= limitAsc,
    );
  }

  const ascAllIds = ascPages.flatMap((p) => p.data.map((s) => s.id));

  const uniqueAscIds = Array.from(new Set(ascAllIds));
  TestValidator.equals(
    "asc combined unique id count should equal created count",
    uniqueAscIds.length,
    createdIds.length,
  );

  TestValidator.equals(
    "asc id set should match created id set (order agnostic)",
    uniqueAscIds.sort(),
    [...createdIds].sort(),
  );

  // 10. Desc sorting case
  const reqDescPage1 = {
    ...reqAscPage1,
    sort_direction: "desc" as const,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrderAddress.IRequest;
  const descPage1: IPageIShoppingMallOrderAddress.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.addresses.index(
      connection,
      {
        orderId,
        body: reqDescPage1,
      },
    );
  typia.assert(descPage1);

  const reqDescPage2 = {
    ...reqDescPage1,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrderAddress.IRequest;
  const descPage2: IPageIShoppingMallOrderAddress.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.addresses.index(
      connection,
      {
        orderId,
        body: reqDescPage2,
      },
    );
  typia.assert(descPage2);

  const reqDescPage3 = {
    ...reqDescPage1,
    page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrderAddress.IRequest;
  const descPage3: IPageIShoppingMallOrderAddress.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.addresses.index(
      connection,
      {
        orderId,
        body: reqDescPage3,
      },
    );
  typia.assert(descPage3);

  const descPages = [descPage1, descPage2, descPage3];
  for (const [index, page] of descPages.entries()) {
    const expectedCurrent = index as number &
      tags.Type<"int32"> &
      tags.Minimum<0>;
    TestValidator.equals(
      `desc page ${index + 1} pagination.limit matches`,
      page.pagination.limit,
      limitAsc,
    );
    TestValidator.equals(
      `desc page ${index + 1} pagination.current matches`,
      page.pagination.current,
      expectedCurrent,
    );
    TestValidator.equals(
      `desc page ${index + 1} pagination.records is 5`,
      page.pagination.records,
      5,
    );
    TestValidator.equals(
      `desc page ${index + 1} pagination.pages is 3`,
      page.pagination.pages,
      3,
    );
    TestValidator.predicate(
      `desc page ${index + 1} data length within limit`,
      page.data.length <= limitAsc,
    );
  }

  const descAllIds = descPages.flatMap((p) => p.data.map((s) => s.id));
  const uniqueDescIds = Array.from(new Set(descAllIds));

  TestValidator.equals(
    "desc combined unique id count should equal created count",
    uniqueDescIds.length,
    createdIds.length,
  );

  TestValidator.equals(
    "desc id set should match created id set (order agnostic)",
    uniqueDescIds.sort(),
    [...createdIds].sort(),
  );
}
