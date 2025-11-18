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
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_fetches_seller_profile_after_onboarding_and_activity(
  connection: api.IConnection,
) {
  // 1. Admin joins (becomes authenticated as admin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: adminHref,
        referrer: adminReferrer,
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Seller joins (connection now authenticated as seller)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: sellerHref,
        referrer: sellerReferrer,
      } satisfies IShoppingMallSellerAuthJoin.IRequest,
    });
  typia.assert(sellerAuthorized);

  // 3. Customer joins (connection now authenticated as customer)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerHref = typia.random<string & tags.Format<"uri">>();
  const customerReferrer = typia.random<string & tags.Format<"uri">>();

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: customerHref,
        referrer: customerReferrer,
      } satisfies IShoppingMallCustomerJoin.IRequest,
    });
  typia.assert(customerAuthorized);

  // Cache ids
  const sellerId = sellerAuthorized.id;
  const customerId = customerAuthorized.id;

  // 4. Switch back to admin via login
  const adminLoginHref = typia.random<string & tags.Format<"uri">>();
  const adminLoginReferrer = typia.random<string & tags.Format<"uri">>();

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: adminLoginHref,
        referrer: adminLoginReferrer,
      } satisfies IShoppingMallAdminLogin.ICreate,
    });
  typia.assert(adminLogin);

  // 5. Admin creates country
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryName = RandomGenerator.paragraph({ sentences: 1 });

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: {
        country_code: countryCode,
        name_en: countryName,
        phone_code: "+82",
        is_active: true,
        sort_order: 1,
      } satisfies IShoppingMallCountry.ICreate,
    });
  typia.assert(country);

  // 6. Admin creates region under country
  const regionCode = RandomGenerator.alphabets(3).toUpperCase();
  const regionName = RandomGenerator.paragraph({ sentences: 1 });

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: {
          code: regionCode,
          name_en: regionName,
          region_type: "state",
          is_active: true,
          sort_order: 1,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert(region);

  // 7. Admin creates shipping method
  const shippingMethodCode = RandomGenerator.alphaNumeric(8);
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: shippingMethodCode,
        display_name: "Standard Shipping",
        service_level_description: "Standard shipping method",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert(shippingMethod);

  // 8. Admin creates payment method
  const paymentMethodCode = RandomGenerator.alphaNumeric(8);
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: paymentMethodCode,
        display_name: "Credit Card",
        description: "Credit card payment",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 9. Admin creates category
  const categorySlug = RandomGenerator.alphaNumeric(8);
  const categoryName = RandomGenerator.paragraph({ sentences: 1 });

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: categorySlug,
        name_en: categoryName,
        description_en: null,
        status: "active",
        sort_order: 1,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 10. Admin creates SKU inventory state
  const inventoryStateCode = RandomGenerator.alphaNumeric(6);
  const inventoryStateName = "In Stock";

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: inventoryStateCode,
          name: inventoryStateName,
          description: null,
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(inventoryState);

  // 11. Seller logs in to create product and SKU
  const sellerLoginHref = typia.random<string & tags.Format<"uri">>();
  const sellerLoginReferrer = typia.random<string & tags.Format<"uri">>();

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: sellerLoginHref,
        referrer: sellerLoginReferrer,
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(sellerLogin);

  // 12. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(8);
  const productTitle = RandomGenerator.paragraph({ sentences: 1 });
  const productSummary = RandomGenerator.paragraph({ sentences: 2 });
  const productDescription = RandomGenerator.content({ paragraphs: 2 });

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        title: productTitle,
        summary: productSummary,
        description: productDescription,
        brand: null,
        model_name: null,
        status: "active",
        primary_image_uri: null,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 13. Switch to admin to link product to category
  const adminLoginHref2 = typia.random<string & tags.Format<"uri">>();
  const adminLoginReferrer2 = typia.random<string & tags.Format<"uri">>();

  const adminLogin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: adminLoginHref2,
        referrer: adminLoginReferrer2,
      } satisfies IShoppingMallAdminLogin.ICreate,
    });
  typia.assert(adminLogin2);

  const productCategory: IShoppingMallProductCategory =
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
  typia.assert(productCategory);

  // 14. Switch back to seller to create SKU
  const sellerLoginHref2 = typia.random<string & tags.Format<"uri">>();
  const sellerLoginReferrer2 = typia.random<string & tags.Format<"uri">>();

  const sellerLogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: sellerLoginHref2,
        referrer: sellerLoginReferrer2,
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(sellerLogin2);

  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        code: skuCode,
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
    });
  typia.assert(sku);

  // 15. Customer logs in
  const customerLoginHref = typia.random<string & tags.Format<"uri">>();
  const customerLoginReferrer = typia.random<string & tags.Format<"uri">>();

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: customerLoginHref,
        referrer: customerLoginReferrer,
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
  typia.assert(customerLogin);

  // 16. Customer creates shipping address
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerId,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(),
          line1: RandomGenerator.paragraph({ sentences: 1 }),
          line2: null,
          city: "Seoul",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);

  // 17. Customer creates cart
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "USD",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  // 18. Customer adds SKU to cart
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // 19. Customer creates order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        cart_id: cart.id,
        currency_code: cart.currency_code,
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: 1,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        shipping_address_id: address.id,
        shipping_address_snapshot: null,
        shipping_method_id: shippingMethod.id,
        payment_method_id: paymentMethod.id,
        buyer_memo: "",
        platform_note: "",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 20. Customer creates payment for order
  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method_id: paymentMethod.id,
          currency_code: order.currency_code,
          payable_amount: order.grand_total_amount,
          provider_reference: null,
          provider_status_code: null,
          metadata: null,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert(orderPayment);

  // 21. Admin logs in again to create seller earning
  const adminLoginHref3 = typia.random<string & tags.Format<"uri">>();
  const adminLoginReferrer3 = typia.random<string & tags.Format<"uri">>();

  const adminLogin3: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: adminLoginHref3,
        referrer: adminLoginReferrer3,
      } satisfies IShoppingMallAdminLogin.ICreate,
    });
  typia.assert(adminLogin3);

  const grossAmount = order.grand_total_amount;
  const sellerDiscountAmount = 0;
  const platformDiscountAmount = 0;
  const commissionAmount = grossAmount * 0.1;
  const otherFeeAmount = 0;
  const netEarningAmount = grossAmount - commissionAmount;

  const earning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerId,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_order_item_id: null,
          shopping_mall_order_payment_id: orderPayment.id,
          currency_code: order.currency_code,
          gross_amount: grossAmount,
          seller_discount_amount: sellerDiscountAmount,
          platform_discount_amount: platformDiscountAmount,
          commission_amount: commissionAmount,
          other_fee_amount: otherFeeAmount,
          net_earning_amount: netEarningAmount,
          earning_type: "order_item",
          business_status: "eligible",
          eligible_at: new Date().toISOString(),
          reversed_at: null,
          metadata: null,
        } satisfies IShoppingMallSellerEarning.ICreate,
      },
    );
  typia.assert(earning);

  // 22. Admin fetches seller profile
  const profile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.admin.sellers.profile.at(connection, {
      sellerId: sellerId,
    });
  typia.assert(profile);

  // Business validations on profile
  TestValidator.equals(
    "profile seller id matches seller",
    profile.shopping_mall_seller_id,
    sellerId,
  );

  TestValidator.predicate(
    "store_name should be non-empty",
    profile.store_name.trim().length > 0,
  );

  if (profile.seller != null) {
    TestValidator.equals(
      "profile seller summary id matches",
      profile.seller.id,
      sellerId,
    );
    TestValidator.equals(
      "profile seller summary email matches",
      profile.seller.email,
      sellerEmail,
    );
  }
}
