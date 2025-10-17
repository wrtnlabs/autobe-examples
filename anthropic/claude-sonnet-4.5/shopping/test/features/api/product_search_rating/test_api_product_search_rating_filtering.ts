import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test product search with minimum rating filter validation.
 *
 * This test validates the product search rating filter functionality by:
 *
 * 1. Creating admin, seller, and multiple customer accounts
 * 2. Setting up product catalog with category and multiple products
 * 3. Creating SKU variants and completing purchase orders
 * 4. Having customers submit reviews with different star ratings
 * 5. Testing product search functionality (rating filter not available in current
 *    API)
 * 6. Note: Full rating filter validation requires API support in
 *    IShoppingMallProduct.IRequest
 */
export async function test_api_product_search_rating_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminCreated = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminCreated);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerCreated = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
        "partnership",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerCreated);

  // Step 4: Create multiple products
  const productCount = 3;
  const products = await ArrayUtil.asyncRepeat(productCount, async () => {
    const product = await api.functional.shoppingMall.seller.products.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          base_price: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
          >(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
    typia.assert(product);
    return product;
  });

  // Step 5: Create SKU variants for each product
  const skus = await ArrayUtil.asyncMap(products, async (product) => {
    const sku = await api.functional.shoppingMall.seller.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          price: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
          >(),
        } satisfies IShoppingMallSku.ICreate,
      },
    );
    typia.assert(sku);
    return sku;
  });

  // Step 6: Create multiple customers with saved credentials for later use
  const customerCount = 3;
  const customerCredentials: Array<{
    email: string;
    password: string;
    customer: IShoppingMallCustomer.IAuthorized;
  }> = [];

  for (let i = 0; i < customerCount; i++) {
    const email = typia.random<string & tags.Format<"email">>();
    const password = typia.random<string & tags.MinLength<8>>();

    const customer = await api.functional.auth.customer.join(connection, {
      body: {
        email: email,
        password: password,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
    typia.assert(customer);

    customerCredentials.push({ email, password, customer });
  }

  // Step 7: For each customer, create orders and reviews with varying ratings
  for (
    let customerIndex = 0;
    customerIndex < customerCredentials.length;
    customerIndex++
  ) {
    const { email, password, customer } = customerCredentials[customerIndex];

    // Create fresh connection for this customer by re-authenticating
    const customerConnection: api.IConnection = { ...connection, headers: {} };
    const reauthedCustomer = await api.functional.auth.customer.join(
      customerConnection,
      {
        body: {
          email: email,
          password: password,
          name: customer.name,
        } satisfies IShoppingMallCustomer.ICreate,
      },
    );
    typia.assert(reauthedCustomer);

    // Create delivery address
    const address = await api.functional.shoppingMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          address_line1: RandomGenerator.paragraph({ sentences: 5 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: RandomGenerator.name(),
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
    typia.assert(address);

    // Create payment method
    const paymentMethod =
      await api.functional.shoppingMall.customer.paymentMethods.create(
        customerConnection,
        {
          body: {
            payment_type: RandomGenerator.pick([
              "credit_card",
              "debit_card",
              "paypal",
            ] as const),
            gateway_token: RandomGenerator.alphaNumeric(32),
          } satisfies IShoppingMallPaymentMethod.ICreate,
        },
      );
    typia.assert(paymentMethod);

    // Select product and SKU for this customer
    const productIndex = customerIndex % products.length;
    const selectedSku = skus[productIndex];

    // Generate cart ID for this session
    const cartId = typia.random<string & tags.Format<"uuid">>();

    // Add item to cart
    await api.functional.shoppingMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cartId,
        body: {
          shopping_mall_sku_id: selectedSku.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );

    // Create order
    const orderResponse =
      await api.functional.shoppingMall.customer.orders.create(
        customerConnection,
        {
          body: {
            delivery_address_id: address.id,
            payment_method_id: paymentMethod.id,
            shipping_method: "standard",
          } satisfies IShoppingMallOrder.ICreate,
        },
      );
    typia.assert(orderResponse);

    // Calculate rating: distribute ratings 1-5 across customers
    const rating = ((customerIndex % 5) + 1) satisfies number as number;

    // Submit review with varying star ratings
    const review = await api.functional.shoppingMall.customer.reviews.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: products[productIndex].id,
          shopping_mall_sku_id: selectedSku.id,
          shopping_mall_order_id: orderResponse.order_ids[0],
          rating: rating,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          review_text: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
    typia.assert(review);
  }

  // Step 8: Test product search functionality
  // Note: IShoppingMallProduct.IRequest currently only supports 'page' parameter
  // Rating filter functionality requires additional API support
  const allProductsResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 1,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(allProductsResult);

  // Step 9: Validate search results structure
  TestValidator.predicate(
    "search results should have valid pagination",
    allProductsResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "search results should contain products",
    allProductsResult.data.length > 0,
  );

  TestValidator.predicate(
    "total records should be tracked",
    allProductsResult.pagination.records >= 0,
  );

  // API Limitation Note:
  // The current IShoppingMallProduct.IRequest DTO only includes 'page' parameter.
  // Full rating filter testing would require:
  // - minRating parameter in IShoppingMallProduct.IRequest
  // - Backend support for filtering by average rating
  // - Calculation of average rating from shopping_mall_reviews
  // - Exclusion of products without reviews when rating filter is applied
  //
  // This test validates the prerequisite workflow (orders, reviews) and basic search.
  // Rating filter functionality should be added when API support is available.
}
