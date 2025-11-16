import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Happy-path test for platform admin retrieving a specific customer cart by ID.
 *
 * Business goal:
 *
 * - Ensure that a platform administrator, once authenticated, can fetch detailed
 *   information for a specific customer cart created by a customer.
 * - Validate that the detail endpoint returns a structurally correct
 *   IShoppingMallCustomerCart and that key business fields (ownership,
 *   configuration, totals, lifecycle flags) are consistent between creation and
 *   admin retrieval.
 *
 * Scenario steps:
 *
 * 1. Register a new customer via auth.customer.join; connection will carry the
 *    customer Authorization token automatically.
 * 2. As that authenticated customer, create a new persistent customer cart via
 *    shoppingMall.customer.customerCarts.create, explicitly setting
 *    currency_code, region_code, and is_active=true to have deterministic
 *    expectations. Capture the created cart, including its id and totals.
 * 3. Register a new platform administrator via auth.platformAdmin.join; this both
 *    creates the admin and authenticates the connection as the platform admin
 *    (Authorization header overwritten by SDK).
 * 4. As the platform admin, call shoppingMall.platformAdmin.customerCarts.at with
 *    the cart id from step 2.
 * 5. Validate that:
 *
 *    - The returned cart passes typia.assert(IShoppingMallCustomerCart).
 *    - The id matches the created cart id.
 *    - The embedded customer summary (id, display_name, avatar_url) matches the
 *         customer summary from the customer authorization envelope.
 *    - Status is a non-empty string.
 *    - Is_active is true (since we created the cart as active).
 *    - Currency_code and region_code equal the values used at creation.
 *    - Deleted_at is null or undefined for a fresh cart.
 *    - Subtotal_amount, discount_amount, tax_amount, shipping_amount, total_amount
 *         are numbers, and total_amount equals subtotal_amount -
 *         discount_amount + tax_amount + shipping_amount.
 */
export async function test_api_platform_admin_get_customer_cart_by_id_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new customer (auth.customer.join)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. As authenticated customer, create a new persistent customer cart
  const createCartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      campaign: "spring_sale",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const createdCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createCartBody,
      },
    );
  typia.assert(createdCart);

  // Basic invariants on created cart
  TestValidator.predicate(
    "created cart id should be a non-empty string",
    createdCart.id.length > 0,
  );
  TestValidator.predicate(
    "created cart should be active",
    createdCart.is_active === true,
  );
  TestValidator.equals(
    "created cart currency_code should match request",
    createdCart.currency_code,
    createCartBody.currency_code,
  );
  TestValidator.equals(
    "created cart region_code should match request",
    createdCart.region_code,
    createCartBody.region_code,
  );

  // 3. Register a new platform administrator (auth.platformAdmin.join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 4. As platform admin, fetch the cart by id
  const fetchedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.platformAdmin.customerCarts.at(
      connection,
      {
        customerCartId: createdCart.id,
      },
    );
  typia.assert(fetchedCart);

  // 5. Structural and business validations between created and fetched cart
  TestValidator.equals(
    "fetched cart id should match created cart id",
    fetchedCart.id,
    createdCart.id,
  );

  // Customer summary consistency
  TestValidator.equals(
    "customer summary id should match authorized customer id",
    fetchedCart.customer.id,
    customerAuthorized.customer.id,
  );
  TestValidator.predicate(
    "customer summary display_name should be non-empty",
    fetchedCart.customer.display_name.length > 0,
  );

  // Status and lifecycle flags
  TestValidator.predicate(
    "cart status should be a non-empty string",
    fetchedCart.status.length > 0,
  );
  TestValidator.predicate(
    "fetched cart should be active",
    fetchedCart.is_active === true,
  );

  // Currency/region consistency
  TestValidator.equals(
    "fetched cart currency_code should match created cart",
    fetchedCart.currency_code,
    createdCart.currency_code,
  );
  TestValidator.equals(
    "fetched cart region_code should match created cart",
    fetchedCart.region_code,
    createdCart.region_code,
  );

  // deleted_at should be null or undefined for a fresh cart
  TestValidator.predicate(
    "deleted_at should be null or undefined for a newly created cart",
    fetchedCart.deleted_at === null || fetchedCart.deleted_at === undefined,
  );

  // Total amounts: ensure numbers and arithmetic consistency
  const subtotal = fetchedCart.subtotal_amount;
  const discount = fetchedCart.discount_amount;
  const tax = fetchedCart.tax_amount;
  const shipping = fetchedCart.shipping_amount;
  const total = fetchedCart.total_amount;

  TestValidator.predicate(
    "subtotal_amount should be a finite number",
    Number.isFinite(subtotal),
  );
  TestValidator.predicate(
    "discount_amount should be a finite number",
    Number.isFinite(discount),
  );
  TestValidator.predicate(
    "tax_amount should be a finite number",
    Number.isFinite(tax),
  );
  TestValidator.predicate(
    "shipping_amount should be a finite number",
    Number.isFinite(shipping),
  );
  TestValidator.predicate(
    "total_amount should be a finite number",
    Number.isFinite(total),
  );

  const expectedTotal = subtotal - discount + tax + shipping;
  TestValidator.equals(
    "total_amount should equal subtotal - discount + tax + shipping",
    total,
    expectedTotal,
  );
}
