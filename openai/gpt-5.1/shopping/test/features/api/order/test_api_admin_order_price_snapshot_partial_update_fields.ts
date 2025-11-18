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

export async function test_api_admin_order_price_snapshot_partial_update_fields(
  connection: api.IConnection,
) {
  // 1. Join actors: customer, seller, admin
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const baseHref = "https://example.com/join" as const;
  const baseReferrer = "https://example.com/landing" as const;

  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "Passw0rd!",
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  // After customer join, connection is authenticated as customer.
  const customerId = customerJoin.id;

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "Passw0rd!",
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Passw0rd!",
      href: baseHref,
      referrer: baseReferrer,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // 2. As admin, seed core master data
  // Ensure we are logged in as admin (join already authenticated as admin)

  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreate =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: {
        country_code: countryCode,
        name_en: "Test Country",
        phone_code: "+99",
        is_active: true,
        sort_order: 1,
      } satisfies IShoppingMallCountry.ICreate,
    });
  typia.assert<IShoppingMallCountry>(countryCreate);

  const regionCreate =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: {
          code: "R1",
          name_en: "Test Region",
          region_type: "state",
          is_active: true,
          sort_order: 1,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert<IShoppingMallRegion>(regionCreate);

  const categoryCreate =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: RandomGenerator.alphaNumeric(8),
        name_en: "Test Category",
        description_en: "Category for price snapshot tests",
        status: "active",
        sort_order: 1,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert<IShoppingMallCategory>(categoryCreate);

  const skuStateCreate =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock",
          name: "In Stock",
          description: "Sellable inventory",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuStateCreate);

  const shippingMethodCreate =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: "standard",
        display_name: "Standard Shipping",
        service_level_description: "Standard delivery",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethodCreate);

  const paymentMethodCreate =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "card",
        display_name: "Credit Card",
        description: "Generic card payment",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethodCreate);

  // 3. Switch to seller and create product + SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "Passw0rd!",
      href: baseHref,
      referrer: baseReferrer,
      ip: null,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreate =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        title: "Snapshot Test Product",
        summary: "Product used for price snapshot partial update tests",
        description: RandomGenerator.paragraph({ sentences: 8 }),
        brand: "TestBrand",
        model_name: "TST-001",
        status: "active",
        primary_image_uri: null,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert<IShoppingMallProduct>(productCreate);

  // Attach category as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "Passw0rd!",
      href: baseHref,
      referrer: baseReferrer,
      ip: null,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const productCategoryCreate =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productCreate.id,
        body: {
          shopping_mall_category_id: categoryCreate.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategoryCreate);

  // Back to seller to create SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "Passw0rd!",
      href: baseHref,
      referrer: baseReferrer,
      ip: null,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const skuCreate =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productCreate.id as string & tags.Format<"uuid">,
      body: {
        code: RandomGenerator.alphaNumeric(6) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100,
        original_price: 120,
        inventory_quantity: 10,
        low_stock_threshold: 1,
        shopping_mall_sku_inventory_state_id: skuStateCreate.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert<IShoppingMallSku>(skuCreate);

  // 4. Switch to customer and create cart, address, and cart item
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "Passw0rd!",
      href: baseHref,
      referrer: baseReferrer,
      ip: null,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cartCreate = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "USD",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert<IShoppingMallCart>(cartCreate);

  const addressCreate =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: {
          shopping_mall_country_id: countryCreate.id,
          shopping_mall_region_id: regionCreate.id,
          recipient_name: "Test Customer",
          line1: "123 Test Street",
          line2: null,
          city: "Test City",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(addressCreate);

  const cartItemCreate =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartCreate.id,
      body: {
        shopping_mall_sku_id: skuCreate.id,
        quantity: 2,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert<IShoppingMallCartItem>(cartItemCreate);

  // 5. Place order
  const orderCreate = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        cart_id: cartCreate.id,
        currency_code: cartCreate.currency_code,
        items: [
          {
            shopping_mall_sku_id: skuCreate.id,
            quantity: cartItemCreate.quantity,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        shipping_address_id: addressCreate.id,
        shipping_address_snapshot: null,
        shipping_method_id: shippingMethodCreate.id,
        payment_method_id: paymentMethodCreate.id,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert<IShoppingMallOrder>(orderCreate);

  const orderCode = orderCreate.order_code;

  // 6. As admin, create an explicit initial price snapshot
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "Passw0rd!",
      href: baseHref,
      referrer: baseReferrer,
      ip: null,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const itemSubtotal = 200; // 2 * price 100
  const initialSnapshot =
    await api.functional.shoppingMall.admin.orders.priceSnapshots.create(
      connection,
      {
        orderCode,
        body: {
          item_subtotal_amount: itemSubtotal,
          item_discount_amount: 0,
          order_discount_amount: 0,
          shipping_fee_amount: 0,
          payment_surcharge_amount: 0,
          tax_amount: 0,
          grand_total_amount: itemSubtotal,
          is_final: false,
        } satisfies IShoppingMallOrderPriceSnapshot.ICreate,
      },
    );
  typia.assert<IShoppingMallOrderPriceSnapshot>(initialSnapshot);

  // 7. First partial update: only shipping_fee_amount, payment_surcharge_amount, grand_total_amount
  const newShippingFee = 10;
  const newSurcharge = 5;
  const expectedGrandTotalAfterFirst =
    initialSnapshot.item_subtotal_amount -
    initialSnapshot.item_discount_amount -
    initialSnapshot.order_discount_amount +
    newShippingFee +
    newSurcharge +
    initialSnapshot.tax_amount;

  const updatedSnapshot1 =
    await api.functional.shoppingMall.admin.orders.priceSnapshots.update(
      connection,
      {
        orderCode,
        snapshotId: initialSnapshot.id,
        body: {
          shipping_fee_amount: newShippingFee,
          payment_surcharge_amount: newSurcharge,
          grand_total_amount: expectedGrandTotalAfterFirst,
        } satisfies IShoppingMallOrderPriceSnapshot.IUpdate,
      },
    );
  typia.assert<IShoppingMallOrderPriceSnapshot>(updatedSnapshot1);

  // 8. Validate partial update behavior
  TestValidator.equals(
    "shipping fee amount should be updated",
    updatedSnapshot1.shipping_fee_amount,
    newShippingFee,
  );
  TestValidator.equals(
    "payment surcharge amount should be updated",
    updatedSnapshot1.payment_surcharge_amount,
    newSurcharge,
  );
  TestValidator.equals(
    "grand total should be recomputed correctly after first partial update",
    updatedSnapshot1.grand_total_amount,
    expectedGrandTotalAfterFirst,
  );

  // Unchanged fields
  TestValidator.equals(
    "item subtotal should remain unchanged after partial update",
    updatedSnapshot1.item_subtotal_amount,
    initialSnapshot.item_subtotal_amount,
  );
  TestValidator.equals(
    "item discount should remain unchanged after partial update",
    updatedSnapshot1.item_discount_amount,
    initialSnapshot.item_discount_amount,
  );
  TestValidator.equals(
    "order discount should remain unchanged after partial update",
    updatedSnapshot1.order_discount_amount,
    initialSnapshot.order_discount_amount,
  );
  TestValidator.equals(
    "tax amount should remain unchanged after partial update",
    updatedSnapshot1.tax_amount,
    initialSnapshot.tax_amount,
  );
  TestValidator.equals(
    "is_final flag should remain unchanged after first partial update",
    updatedSnapshot1.is_final,
    initialSnapshot.is_final,
  );
  TestValidator.equals(
    "snapshot id should remain the same after update",
    updatedSnapshot1.id,
    initialSnapshot.id,
  );
  TestValidator.equals(
    "snapshot created_at should remain the same after update",
    updatedSnapshot1.created_at,
    initialSnapshot.created_at,
  );

  // 9. Second partial update: toggle is_final only, keep monetary fields unchanged
  const updatedSnapshot2 =
    await api.functional.shoppingMall.admin.orders.priceSnapshots.update(
      connection,
      {
        orderCode,
        snapshotId: initialSnapshot.id,
        body: {
          is_final: !updatedSnapshot1.is_final,
        } satisfies IShoppingMallOrderPriceSnapshot.IUpdate,
      },
    );
  typia.assert<IShoppingMallOrderPriceSnapshot>(updatedSnapshot2);

  TestValidator.equals(
    "is_final should be toggled after second partial update",
    updatedSnapshot2.is_final,
    !updatedSnapshot1.is_final,
  );

  TestValidator.equals(
    "item_subtotal_amount should remain unchanged after second partial update",
    updatedSnapshot2.item_subtotal_amount,
    updatedSnapshot1.item_subtotal_amount,
  );
  TestValidator.equals(
    "item_discount_amount should remain unchanged after second partial update",
    updatedSnapshot2.item_discount_amount,
    updatedSnapshot1.item_discount_amount,
  );
  TestValidator.equals(
    "order_discount_amount should remain unchanged after second partial update",
    updatedSnapshot2.order_discount_amount,
    updatedSnapshot1.order_discount_amount,
  );
  TestValidator.equals(
    "shipping_fee_amount should remain unchanged after second partial update",
    updatedSnapshot2.shipping_fee_amount,
    updatedSnapshot1.shipping_fee_amount,
  );
  TestValidator.equals(
    "payment_surcharge_amount should remain unchanged after second partial update",
    updatedSnapshot2.payment_surcharge_amount,
    updatedSnapshot1.payment_surcharge_amount,
  );
  TestValidator.equals(
    "tax_amount should remain unchanged after second partial update",
    updatedSnapshot2.tax_amount,
    updatedSnapshot1.tax_amount,
  );
  TestValidator.equals(
    "grand_total_amount should remain unchanged after second partial update",
    updatedSnapshot2.grand_total_amount,
    updatedSnapshot1.grand_total_amount,
  );
}
