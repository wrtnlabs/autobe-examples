import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewHelpfulVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewHelpfulVote";
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
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewHelpfulVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulVote";
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

export async function test_api_customer_helpful_votes_search_pagination_and_filters(
  connection: api.IConnection,
) {
  // 1. Create primary customer via join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);
  const customerId = customer.id;

  // 2. Create admin and login
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create seller and login
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const sellerLoginBody = {
    email: seller.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. Admin master data: country
  const countryBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // 5. Admin region
  const regionBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 6. Admin shipping method
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  // 7. Admin payment method
  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 8. Admin SKU inventory state
  const skuStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuStateBody,
      },
    );
  typia.assert(skuState);

  // 9. Admin category
  const categoryBody = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronic devices",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 10. Seller product (seller already logged in)
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE-Test-Brand",
    model_name: "Model-1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 11. Link product to category (admin call)
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
  typia.assert(productCategory);

  // 12. Seller SKU for product
  const skuBody = {
    code: RandomGenerator.alphaNumeric(6) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 13. Customer login (ensure customer token active)
  const customerLoginBody = {
    email: customer.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 14. Customer shipping address
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: "Suite 100",
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 15. Customer cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 16. Cart items (3 items)
  const cartItems: IShoppingMallCartItem[] = [];
  for (let i = 0; i < 3; i++) {
    const cartItemBody = {
      shopping_mall_sku_id: sku.id,
      quantity: (i + 1) as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallCartItem.ICreate;
    const cartItem: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id as string & tags.Format<"uuid">,
          body: cartItemBody,
        },
      );
    typia.assert(cartItem);
    cartItems.push(cartItem);
  }

  // 17. Customer order from cart
  const orderItemsBody: IShoppingMallOrderItem.ICreate[] = cartItems.map(
    (ci) =>
      ({
        shopping_mall_sku_id: ci.shopping_mall_sku_id,
        quantity: ci.quantity,
      }) satisfies IShoppingMallOrderItem.ICreate,
  );

  const orderBody = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: cart.currency_code,
    items: orderItemsBody,
    shipping_address_id: address.id as string & tags.Format<"uuid">,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id as string & tags.Format<"uuid">,
    payment_method_id: paymentMethod.id as string & tags.Format<"uuid">,
    buyer_memo: "Please deliver between 9am-5pm",
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 18. Create reviews for the customer (3 reviews)
  const reviews: IShoppingMallReview[] = [];
  for (let i = 0; i < 3; i++) {
    const reviewBody = {
      rating: (3 + (i % 3)) as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<5>,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies IShoppingMallReview.ICreate;
    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.reviews.create(connection, {
        body: reviewBody,
      });
    typia.assert(review);
    reviews.push(review);
  }

  // 19. Create helpful votes (6 votes total)
  const helpfulVotes: IShoppingMallReviewHelpfulVote[] = [];
  for (let i = 0; i < 6; i++) {
    const helpfulVoteBody = {
      is_helpful: i % 2 === 0,
    } satisfies IShoppingMallReviewHelpfulVote.ICreate;
    const vote: IShoppingMallReviewHelpfulVote =
      await api.functional.shoppingMall.customer.reviewHelpfulVotes.create(
        connection,
        {
          body: helpfulVoteBody,
        },
      );
    typia.assert(vote);
    helpfulVotes.push(vote);
  }

  // 20. First search: page 1, limit 3, filter by customerId only
  const searchBody1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 3 as number & tags.Type<"int32">,
    sortBy: undefined,
    sortDirection: undefined,
    reviewId: undefined,
    customerId,
    isHelpful: undefined,
    createdFrom: undefined,
    createdTo: undefined,
  } satisfies IShoppingMallReviewHelpfulVote.IRequest;
  const page1: IPageIShoppingMallReviewHelpfulVote.ISummary =
    await api.functional.shoppingMall.customer.customers.helpfulVotes.index(
      connection,
      {
        customerId: customerId as string & tags.Format<"uuid">,
        body: searchBody1,
      },
    );
  typia.assert(page1);

  TestValidator.equals(
    "pagination current page 1",
    page1.pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination limit 3",
    page1.pagination.limit,
    3 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "records at least created votes",
    page1.pagination.records >= helpfulVotes.length,
  );
  const expectedPages =
    page1.pagination.limit === 0
      ? 0
      : Math.ceil(page1.pagination.records / page1.pagination.limit);
  TestValidator.equals(
    "pages math",
    page1.pagination.pages,
    expectedPages as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  for (const row of page1.data) {
    TestValidator.equals(
      "all customer ids match path",
      row.shopping_mall_customer_id,
      customerId,
    );
  }

  // 21. Second search: filter by isHelpful=true
  const searchBody2 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sortBy: undefined,
    sortDirection: undefined,
    reviewId: undefined,
    customerId,
    isHelpful: true,
    createdFrom: undefined,
    createdTo: undefined,
  } satisfies IShoppingMallReviewHelpfulVote.IRequest;
  const pageHelpfulTrue: IPageIShoppingMallReviewHelpfulVote.ISummary =
    await api.functional.shoppingMall.customer.customers.helpfulVotes.index(
      connection,
      {
        customerId: customerId as string & tags.Format<"uuid">,
        body: searchBody2,
      },
    );
  typia.assert(pageHelpfulTrue);

  for (const row of pageHelpfulTrue.data) {
    TestValidator.equals("filter isHelpful true", row.is_helpful, true);
    TestValidator.equals(
      "customer id matches",
      row.shopping_mall_customer_id,
      customerId,
    );
  }

  // 22. Third search: filter by reviewId of one of the helpfulVotes (if any)
  const targetVote: IShoppingMallReviewHelpfulVote | undefined =
    helpfulVotes.find((v) => v.is_helpful === true);
  if (targetVote !== undefined) {
    const searchBody3 = {
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
      sortBy: undefined,
      sortDirection: undefined,
      reviewId: targetVote.review_id,
      customerId,
      isHelpful: true,
      createdFrom: undefined,
      createdTo: undefined,
    } satisfies IShoppingMallReviewHelpfulVote.IRequest;
    const pageByReview: IPageIShoppingMallReviewHelpfulVote.ISummary =
      await api.functional.shoppingMall.customer.customers.helpfulVotes.index(
        connection,
        {
          customerId: customerId as string & tags.Format<"uuid">,
          body: searchBody3,
        },
      );
    typia.assert(pageByReview);

    for (const row of pageByReview.data) {
      TestValidator.equals(
        "review id matches filter",
        row.shopping_mall_review_id,
        targetVote.review_id,
      );
      TestValidator.equals("is_helpful true", row.is_helpful, true);
      TestValidator.equals(
        "customer id matches",
        row.shopping_mall_customer_id,
        customerId,
      );
    }

    const expectedPagesByReview =
      pageByReview.pagination.limit === 0
        ? 0
        : Math.ceil(
            pageByReview.pagination.records / pageByReview.pagination.limit,
          );
    TestValidator.equals(
      "pages math by review",
      pageByReview.pagination.pages,
      expectedPagesByReview as number & tags.Type<"int32"> & tags.Minimum<0>,
    );
  }

  // 23. Fourth search: filter with random reviewId that should yield zero records
  const randomReviewId = typia.random<string & tags.Format<"uuid">>();
  const searchBody4 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    sortBy: undefined,
    sortDirection: undefined,
    reviewId: randomReviewId,
    customerId,
    isHelpful: true,
    createdFrom: undefined,
    createdTo: undefined,
  } satisfies IShoppingMallReviewHelpfulVote.IRequest;
  const pageEmpty: IPageIShoppingMallReviewHelpfulVote.ISummary =
    await api.functional.shoppingMall.customer.customers.helpfulVotes.index(
      connection,
      {
        customerId: customerId as string & tags.Format<"uuid">,
        body: searchBody4,
      },
    );
  typia.assert(pageEmpty);

  TestValidator.equals("empty filter data length", pageEmpty.data.length, 0);
  TestValidator.equals(
    "empty filter records",
    pageEmpty.pagination.records,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "empty filter pages",
    pageEmpty.pagination.pages,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "empty filter current page",
    pageEmpty.pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "empty filter limit",
    pageEmpty.pagination.limit,
    5 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  // 24. Authorization boundary: second customer should not access first customer's votes
  const secondCustomerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://customer2.example.com/join",
    referrer: "https://customer2.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const secondCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: secondCustomerJoinBody,
    });
  typia.assert(secondCustomer);

  const secondSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 3 as number & tags.Type<"int32">,
    sortBy: undefined,
    sortDirection: undefined,
    reviewId: undefined,
    customerId,
    isHelpful: undefined,
    createdFrom: undefined,
    createdTo: undefined,
  } satisfies IShoppingMallReviewHelpfulVote.IRequest;

  await TestValidator.error(
    "cross-customer helpful votes access must fail",
    async () => {
      await api.functional.shoppingMall.customer.customers.helpfulVotes.index(
        connection,
        {
          customerId: customerId as string & tags.Format<"uuid">,
          body: secondSearchBody,
        },
      );
    },
  );
}
