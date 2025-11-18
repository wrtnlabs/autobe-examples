import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";

export async function test_api_customer_cart_multiple_carts_per_customer_policy(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Create multiple carts for the same customer
  const currencyCode = "USD";
  const cartCreateBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: currencyCode,
  } satisfies IShoppingMallCart.ICreate;

  const createdCarts: IShoppingMallCart[] = [];
  const CART_COUNT = 3;

  for (let i = 0; i < CART_COUNT; i++) {
    const cart: IShoppingMallCart =
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: cartCreateBody,
      });
    typia.assert<IShoppingMallCart>(cart);

    TestValidator.equals(
      `cart ${i} actor_type should be customer`,
      cart.actor_type,
      "customer",
    );
    TestValidator.equals(
      `cart ${i} currency_code should match`,
      cart.currency_code,
      currencyCode,
    );

    createdCarts.push(cart);
  }

  // Ensure we actually created multiple distinct carts
  const cartIds = createdCarts.map((c) => c.id);
  const uniqueCartIds = Array.from(new Set(cartIds));
  TestValidator.equals(
    "number of unique cart ids should equal number of created carts",
    uniqueCartIds.length,
    createdCarts.length,
  );
  TestValidator.predicate(
    "should have created at least two carts for the same customer",
    createdCarts.length >= 2,
  );

  // Sanity checks for last_validated_at and estimated_total_amount on created carts
  for (let i = 0; i < createdCarts.length; i++) {
    const cart = createdCarts[i];
    if (
      cart.last_validated_at !== null &&
      cart.last_validated_at !== undefined
    ) {
      TestValidator.predicate(
        `cart ${i} last_validated_at present should be non-empty string`,
        cart.last_validated_at.length > 0,
      );
    }
    if (cart.estimated_total_amount !== undefined) {
      TestValidator.predicate(
        `cart ${i} estimated_total_amount should be >= 0 when defined`,
        cart.estimated_total_amount >= 0,
      );
    }
  }

  // 3. Admin registration and login (switch actor context)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedOnJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedOnJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedOnLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedOnLogin);

  // 4. Admin cart search filtered by the customer
  const adminSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: "updatedAt" as const,
    sortDirection: "desc" as const,
    ownerType: "customer" as const,
    customerId: customerAuthorized.id,
    guestUserId: null,
    email: customerAuthorized.email,
    status: "any" as const,
    minItemCount: null,
    maxItemCount: null,
    minEstimatedTotal: null,
    maxEstimatedTotal: null,
    createdFrom: null,
    createdTo: null,
    updatedFrom: null,
    updatedTo: null,
  } satisfies IShoppingMallCart.IRequest;

  const adminPage: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.admin.carts.index(connection, {
      body: adminSearchBody,
    });
  typia.assert<IPageIShoppingMallCart.ISummary>(adminPage);

  // 5. Cross-check that created carts are visible in admin listing
  const summaries = adminPage.data;
  const createdIdSet = new Set<string>(cartIds);
  const matchedSummaries = summaries.filter((s) => createdIdSet.has(s.id));

  TestValidator.predicate(
    "at least one of the created carts should be visible in admin search",
    matchedSummaries.length >= 1,
  );

  for (const summary of matchedSummaries) {
    typia.assert<IShoppingMallCart.ISummary>(summary);
    TestValidator.equals(
      `summary ${summary.id} actor_type should be customer`,
      summary.actor_type,
      "customer",
    );
    TestValidator.equals(
      `summary ${summary.id} currency_code should match`,
      summary.currency_code,
      currencyCode,
    );

    if (
      summary.owner_customer !== null &&
      summary.owner_customer !== undefined
    ) {
      TestValidator.equals(
        `summary ${summary.id} owner_customer.id should equal customer id`,
        summary.owner_customer.id,
        customerAuthorized.id,
      );
    }

    TestValidator.predicate(
      `summary ${summary.id} status should be non-empty string`,
      summary.status.length > 0,
    );

    if (
      summary.last_validated_at !== null &&
      summary.last_validated_at !== undefined
    ) {
      TestValidator.predicate(
        `summary ${summary.id} last_validated_at present should be non-empty string`,
        summary.last_validated_at.length > 0,
      );
    }
    if (summary.estimated_total_amount !== undefined) {
      TestValidator.predicate(
        `summary ${summary.id} estimated_total_amount should be >= 0 when defined`,
        summary.estimated_total_amount >= 0,
      );
    }
  }
}
