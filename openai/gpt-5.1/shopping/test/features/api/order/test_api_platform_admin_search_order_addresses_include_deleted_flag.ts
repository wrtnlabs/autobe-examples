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

export async function test_api_platform_admin_search_order_addresses_include_deleted_flag(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminPassword = "Str0ngPa$w0rd";

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        email: platformAdminEmail,
        name: RandomGenerator.name(),
        password: platformAdminPassword,
        ip: null,
        href: "https://admin.shoppingmall.local/join",
        referrer: "https://admin.shoppingmall.local/",
      } satisfies IShoppingMallPlatformAdminJoin.IRequest,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminJoin);

  // 2. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerP@ssw0rd";

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      storeName: RandomGenerator.name(1),
      contactPhone: RandomGenerator.mobile(),
    } satisfies IShoppingMallSellerJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  // 3. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "Cust0merP@ss";

  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      ip: null,
      href: "https://shoppingmall.local/join",
      referrer: "https://shoppingmall.local/landing",
    } satisfies IShoppingMallCustomerAuth.IJoin,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  // 4. As platform admin, create category tree
  const categoryTreeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const categoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: {
          code: categoryTreeCode,
          name: "Main Catalog Tree",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          active: true,
          defaultLocale: "en-US",
        } satisfies IShoppingMallCategoryTree.ICreate,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 5. As platform admin, create brand
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(6)}`;
  const brand = await api.functional.shoppingMall.platformAdmin.brands.create(
    connection,
    {
      body: {
        name: "Test Brand",
        slug: brandSlug,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_uri: "https://cdn.shoppingmall.local/logo/test-brand.png",
      } satisfies IShoppingMallBrand.ICreate,
    },
  );
  typia.assert<IShoppingMallBrand>(brand);

  // 6. As platform admin, create product for the seller
  const productCode = `prd-${RandomGenerator.alphaNumeric(10)}`;
  const product =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: {
          shopping_mall_seller_id: sellerJoin.id,
          shopping_mall_brand_id: brand.id,
          code: productCode,
          name: "E2E Test Product",
          short_description: "Short description for e2e test product",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          status: "active",
          is_multi_sku: true,
          primary_image_uri:
            "https://cdn.shoppingmall.local/images/products/test-product.png",
          additional_data: null,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert<IShoppingMallProduct>(product);

  // 7. As platform admin, create SKU for the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const sku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: {
          code: skuCode,
          name: "E2E SKU Variant",
          listPrice: 100,
          salePrice: 100,
          currency: "USD",
          isActive: true,
          isPurchasable: true,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert<IShoppingMallProductSku>(sku);

  // 8. As seller, create inventory item for the SKU
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.shoppingmall.local/login",
      referrer: "https://seller.shoppingmall.local/",
    } satisfies IShoppingMallSellerLogin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

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

  // 9. As customer, login and create cart
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shoppingmall.local/login",
      referrer: "https://shoppingmall.local/landing",
      userAgent: "e2e-test-agent",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  const cart = await api.functional.shoppingMall.customer.customerCarts.create(
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

  // 10. Add item to cart
  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const cartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: {
          skuId: sku.id,
          quantity,
          note: "E2E order line",
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 11. Create order from cart
  const itemsSubtotal = 200; // 2 * 100
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  // For simplicity, generate placeholder address IDs; backend may derive from
  // other state, but our focus is on address search behavior after explicit
  // snapshots are created.
  const placeholderShippingId = typia.random<string & tags.Format<"uuid">>();
  const placeholderBillingId = typia.random<string & tags.Format<"uuid">>();

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        customer_cart_id: cart.id,
        currency_code: "USD",
        items_subtotal_amount: itemsSubtotal,
        discount_total_amount: discountTotal,
        shipping_total_amount: shippingTotal,
        tax_total_amount: taxTotal,
        grand_total_amount: grandTotal,
        shipping_address_id: placeholderShippingId,
        billing_address_id: placeholderBillingId,
        customer_note: "E2E order for address search",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  // 12. Create two order address snapshots for this order
  const shippingAddress =
    await api.functional.shoppingMall.orders.addresses.create(connection, {
      orderId: order.id,
      body: {
        address_type: "shipping",
        recipient_name: "Shipping Recipient",
        street_line1: "123 Shipping St.",
        street_line2: "Unit 1",
        city: "Ship City",
        region: "CA",
        postal_code: "90001",
        country_code: "US",
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallOrderAddress.ICreate,
    });
  typia.assert<IShoppingMallOrderAddress>(shippingAddress);

  const billingAddress =
    await api.functional.shoppingMall.orders.addresses.create(connection, {
      orderId: order.id,
      body: {
        address_type: "billing",
        recipient_name: "Billing Recipient",
        street_line1: "456 Billing Ave.",
        street_line2: "Suite 200",
        city: "Bill City",
        region: "NY",
        postal_code: "10001",
        country_code: "US",
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallOrderAddress.ICreate,
    });
  typia.assert<IShoppingMallOrderAddress>(billingAddress);

  // 13. Re-login as platform admin to ensure admin context
  const platformAdminLogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        email: platformAdminEmail,
        password: platformAdminPassword,
        ip: null,
        href: "https://admin.shoppingmall.local/login",
        referrer: "https://admin.shoppingmall.local/",
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminLogin);

  // 14. Search order addresses without include_deleted (default: false)
  const firstPage =
    await api.functional.shoppingMall.platformAdmin.orders.addresses.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at",
          sort_direction: "asc",
          address_type: undefined,
          country_code: undefined,
          postal_code: undefined,
          recipient_name: undefined,
          include_deleted: undefined,
        } satisfies IShoppingMallOrderAddress.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallOrderAddress.ISummary>(firstPage);

  // Basic assertions about pagination and data content
  TestValidator.predicate(
    "first page should contain at least two address snapshots",
    firstPage.data.length >= 2,
  );

  // Ensure all addresses in response belong to our order id
  for (const addr of firstPage.data) {
    TestValidator.equals(
      "address summary order id must equal target order id",
      addr.order.id,
      order.id,
    );
  }

  // 15. Search order addresses with include_deleted explicitly true
  const secondPage =
    await api.functional.shoppingMall.platformAdmin.orders.addresses.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at",
          sort_direction: "asc",
          address_type: undefined,
          country_code: undefined,
          postal_code: undefined,
          recipient_name: undefined,
          include_deleted: true,
        } satisfies IShoppingMallOrderAddress.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallOrderAddress.ISummary>(secondPage);

  // 16. Compare results between queries
  TestValidator.equals(
    "pagination.records should match between include_deleted=false and true",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "pagination.pages should match between both queries",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );

  TestValidator.equals(
    "number of address summaries should be same between both queries",
    firstPage.data.length,
    secondPage.data.length,
  );

  // Compare sets of ids
  const firstIds = firstPage.data.map((d) => d.id).sort();
  const secondIds = secondPage.data.map((d) => d.id).sort();

  TestValidator.equals(
    "address id sets should be identical between include_deleted=false and true",
    firstIds,
    secondIds,
  );
}
