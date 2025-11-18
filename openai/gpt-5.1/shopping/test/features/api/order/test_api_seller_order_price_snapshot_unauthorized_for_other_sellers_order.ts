import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_seller_order_price_snapshot_unauthorized_for_other_sellers_order(
  connection: api.IConnection,
) {
  // 1. Admin, Seller A/B, Customer registrations
  const nowSuffix = Date.now().toString();
  const adminEmail = `admin+${nowSuffix}@example.com`;
  const sellerAEmail = `sellerA+${nowSuffix}@example.com`;
  const sellerBEmail = `sellerB+${nowSuffix}@example.com`;
  const customerEmail = `customer+${nowSuffix}@example.com`;

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: null,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert(admin);

  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: "SellerAPassword123!",
      ip: null,
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert(sellerA);

  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: "SellerBPassword123!",
      ip: null,
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert(sellerB);

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPassword123!",
      ip: null,
      href: "https://shop.example.com/join",
      referrer: "https://shop.example.com/",
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert(customer);

  // 2. As admin, create country, region, inventory state, shipping method, payment method, category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: {
        country_code: "US",
        name_en: "United States",
        phone_code: "+1",
        is_active: true,
        sort_order: 1,
      } satisfies IShoppingMallCountry.ICreate,
    },
  );
  typia.assert(country);

  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: {
          code: "CA",
          name_en: "California",
          region_type: "state",
          is_active: true,
          sort_order: 1,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert(region);

  const inventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: `in_stock_${nowSuffix}`,
          name: "In Stock",
          description: "Purchasable stock",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(inventoryState);

  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: `standard_${nowSuffix}`,
        display_name: "Standard Shipping",
        service_level_description: "Standard ground shipping",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert(shippingMethod);

  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: `card_${nowSuffix}`,
        display_name: "Credit Card",
        description: "Visa/MasterCard",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        slug: `electronics-${nowSuffix}`,
        name_en: "Electronics",
        description_en: "Electronics category",
        status: "active",
        sort_order: 1,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. As Seller A, create product and SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAEmail,
      password: "SellerAPassword123!",
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: `PROD-${nowSuffix}`,
        title: "Test Product",
        summary: "Test product summary",
        description: "Test product description",
        brand: null,
        model_name: null,
        status: "active",
        primary_image_uri: null,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Associate product with category as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: null,
      href: "https://admin.example.com/login2",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const productCategoryLink =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategoryLink);

  // Back to Seller A to create SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAEmail,
      password: "SellerAPassword123!",
      ip: null,
      href: "https://seller.example.com/login2",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        code: `SKU-${nowSuffix}`,
        barcode: null,
        status: "active",
        price: 100,
        original_price: null,
        inventory_quantity: 10,
        low_stock_threshold: null,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. As customer, create cart, add item, address, and order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPassword123!",
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "USD",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  const shippingAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: "John Doe",
          line1: "123 Main St",
          line2: null,
          city: "Los Angeles",
          postal_code: "90001",
          phone_number: "555-1234",
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(shippingAddress);

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        cart_id: cart.id,
        currency_code: cart.currency_code,
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: 1,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        shipping_address_id: shippingAddress.id,
        shipping_address_snapshot: null,
        shipping_method_id: shippingMethod.id,
        payment_method_id: paymentMethod.id,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Sanity: the single line item should be from Seller A (sellerA.id)
  if (order.items.length > 0) {
    const item = order.items[0];
    if (item.seller) {
      TestValidator.equals(
        "order item seller is seller A",
        item.seller.id,
        sellerA.id,
      );
    }
  }

  const orderCode = order.order_code;

  // 5. As Seller B, attempt to create price snapshot and expect error
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBEmail,
      password: "SellerBPassword123!",
      ip: null,
      href: "https://seller.example.com/loginB",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  await TestValidator.error(
    "other seller cannot create price snapshot",
    async () => {
      await api.functional.shoppingMall.seller.orders.priceSnapshots.create(
        connection,
        {
          orderCode,
          body: {
            item_subtotal_amount: 100,
            item_discount_amount: 0,
            order_discount_amount: 0,
            shipping_fee_amount: 0,
            payment_surcharge_amount: 0,
            tax_amount: 0,
            grand_total_amount: 100,
            is_final: false,
          } satisfies IShoppingMallOrderPriceSnapshot.ICreate,
        },
      );
    },
  );
}
