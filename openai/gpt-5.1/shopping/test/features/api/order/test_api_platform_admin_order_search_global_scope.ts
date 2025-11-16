import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_platform_admin_order_search_global_scope(
  connection: api.IConnection,
) {
  // 1. Register Customer A and Customer B, keeping raw passwords
  const customerAPassword = RandomGenerator.alphaNumeric(12);
  const customerAJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerAPassword,
      name: RandomGenerator.name(),
      ip: null,
      href: "https://customer-a.example.com/join",
      referrer: "https://customer-a.example.com/landing",
    } satisfies IShoppingMallCustomerAuth.IJoin,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAJoin);

  const customerBPassword = RandomGenerator.alphaNumeric(12);
  const customerBJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerBPassword,
      name: RandomGenerator.name(),
      ip: null,
      href: "https://customer-b.example.com/join",
      referrer: "https://customer-b.example.com/landing",
    } satisfies IShoppingMallCustomerAuth.IJoin,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBJoin);

  const customerASummary = customerAJoin.customer;
  const customerBSummary = customerBJoin.customer;

  // 2. Register a seller, keeping raw password
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      storeName: RandomGenerator.name(1),
      contactPhone: RandomGenerator.mobile(),
    } satisfies IShoppingMallSellerJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerId = sellerJoin.id;

  // 3. Register a platform admin, keeping raw password
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminPassword = RandomGenerator.alphaNumeric(16);

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        email: platformAdminEmail,
        name: RandomGenerator.name(1),
        password: platformAdminPassword,
        ip: null,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies IShoppingMallPlatformAdminJoin.IRequest,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminJoin);

  // 4. As platform admin, create category tree and brand
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const categoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: {
          code: `tree-${RandomGenerator.alphaNumeric(8)}`,
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          active: true,
          defaultLocale: "en-US",
        } satisfies IShoppingMallCategoryTree.ICreate,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  const brand = await api.functional.shoppingMall.platformAdmin.brands.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(1),
        slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_uri: "https://cdn.example.com/logo.png",
      } satisfies IShoppingMallBrand.ICreate,
    },
  );
  typia.assert<IShoppingMallBrand>(brand);

  // 5. As seller, create product, SKU, inventory
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/landing",
    } satisfies IShoppingMallSellerLogin.IRequest,
  });

  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_brand_id: brand.id,
        code: productCode,
        name: RandomGenerator.name(2),
        short_description: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        is_multi_sku: true,
        primary_image_uri: "https://cdn.example.com/product.png",
        additional_data: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(6)}`;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productCode,
      body: {
        code: skuCode,
        name: RandomGenerator.name(2),
        listPrice: 100,
        salePrice: 80,
        currency: "USD",
        isActive: true,
        isPurchasable: true,
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert<IShoppingMallProductSku>(sku);

  const inventory =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: {
        product_sku_id: sku.id,
        on_hand_quantity: 100,
        low_stock_threshold: 5,
        backorder_enabled: false,
        preorder_enabled: false,
      } satisfies IShoppingMallInventoryItem.ICreate,
    });
  typia.assert<IShoppingMallInventoryItem>(inventory);

  // Helper to create cart, item, and order for a customer
  const createOrderForCustomer = async (
    email: string & tags.Format<"email">,
    password: string,
    quantity: number,
  ): Promise<IShoppingMallOrder> => {
    await api.functional.auth.customer.login(connection, {
      body: {
        email,
        password,
        ip: null,
        href: "https://customer.example.com/login",
        referrer: "https://customer.example.com/landing",
        userAgent: "e2e-test-agent",
      } satisfies IShoppingMallCustomerAuth.ILogin,
    });

    const cart =
      await api.functional.shoppingMall.customer.customerCarts.create(
        connection,
        {
          body: {
            currency_code: "USD",
            region_code: "US",
            channel: "web",
            metadata: undefined,
            is_active: true,
            source_guest_token: undefined,
          } satisfies IShoppingMallCustomerCart.ICreate,
        },
      );
    typia.assert<IShoppingMallCustomerCart>(cart);

    const cartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: cart.id,
          body: {
            skuId: sku.id,
            quantity,
            note: null,
          } satisfies IShoppingMallCustomerCartItem.ICreate,
        },
      );
    typia.assert<IShoppingMallCustomerCartItem>(cartItem);

    const unitPrice = sku.salePrice;
    const itemsSubtotal = unitPrice * quantity;
    const discount = 0;
    const shipping = 10;
    const tax = Math.round(itemsSubtotal * 0.1);
    const grandTotal = itemsSubtotal - discount + shipping + tax;

    const order = await api.functional.shoppingMall.customer.orders.create(
      connection,
      {
        body: {
          customer_cart_id: cart.id,
          currency_code: cart.currency_code,
          items_subtotal_amount: itemsSubtotal,
          discount_total_amount: discount,
          shipping_total_amount: shipping,
          tax_total_amount: tax,
          grand_total_amount: grandTotal,
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          customer_note: undefined,
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
    typia.assert<IShoppingMallOrder>(order);
    return order;
  };

  // 6. Create order for Customer A
  const orderA = await createOrderForCustomer(
    customerAJoin.email,
    customerAPassword,
    1,
  );

  // 7. Create order for Customer B with different quantity
  const orderB = await createOrderForCustomer(
    customerBJoin.email,
    customerBPassword,
    2,
  );

  // 8. Re-authenticate as platform admin before search
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  // 9. Search globally as platform admin without customerId
  const searchRequest = {
    page: 1,
    limit: 50,
    id: undefined,
    orderCode: undefined,
    customerId: undefined,
    currencyCode: "USD",
    orderStatuses: undefined,
    paymentStatuses: undefined,
    placedAtFrom: undefined,
    placedAtTo: undefined,
    createdAtFrom: undefined,
    createdAtTo: undefined,
    itemsSubtotalAmountMin: undefined,
    itemsSubtotalAmountMax: undefined,
    discountTotalAmountMin: undefined,
    discountTotalAmountMax: undefined,
    shippingTotalAmountMin: undefined,
    shippingTotalAmountMax: undefined,
    taxTotalAmountMin: undefined,
    taxTotalAmountMax: undefined,
    grandTotalAmountMin: undefined,
    grandTotalAmountMax: undefined,
    includeDeleted: false,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallOrder.IRequest;

  const pageResult =
    await api.functional.shoppingMall.platformAdmin.orders.search.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert<IPageIShoppingMallOrder.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  const summaries = pageResult.data;

  TestValidator.predicate(
    "pagination records at least 2",
    pagination.records >= 2,
  );

  TestValidator.predicate("data length at least 2", summaries.length >= 2);

  const foundA = summaries.find((s) => s.id === orderA.id);
  const foundB = summaries.find((s) => s.id === orderB.id);

  TestValidator.predicate(
    "order A summary should be present",
    foundA !== undefined,
  );
  TestValidator.predicate(
    "order B summary should be present",
    foundB !== undefined,
  );

  if (foundA !== undefined) {
    TestValidator.equals(
      "order A currency matches",
      foundA.currency,
      orderA.currency_code,
    );
    TestValidator.equals(
      "order A total amount matches",
      foundA.total_amount,
      orderA.grand_total_amount,
    );
    if (foundA.customer !== undefined) {
      TestValidator.equals(
        "order A customer id matches customer A",
        foundA.customer.id,
        customerASummary.id,
      );
    }
  }

  if (foundB !== undefined) {
    TestValidator.equals(
      "order B currency matches",
      foundB.currency,
      orderB.currency_code,
    );
    TestValidator.equals(
      "order B total amount matches",
      foundB.total_amount,
      orderB.grand_total_amount,
    );
    if (foundB.customer !== undefined) {
      TestValidator.equals(
        "order B customer id matches customer B",
        foundB.customer.id,
        customerBSummary.id,
      );
    }
  }

  if (foundA !== undefined && foundB !== undefined) {
    TestValidator.predicate(
      "order summaries reference different customers",
      foundA.customer !== undefined &&
        foundB.customer !== undefined &&
        foundA.customer.id !== foundB.customer.id,
    );
  }
}
