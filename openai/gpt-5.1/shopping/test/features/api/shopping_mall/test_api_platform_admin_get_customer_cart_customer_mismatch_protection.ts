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
 * Validate that platform admin cart detail retrieval respects correct customer
 * ownership and does not cross-wire carts between different customers.
 *
 * Flow:
 *
 * 1. Register Customer A via /auth/customer/join and keep its authorized envelope.
 * 2. As Customer A, create Cart A via /shoppingMall/customer/customerCarts.
 * 3. Register Customer B and create Cart B the same way.
 * 4. Register a platform admin via /auth/platformAdmin/join and explicitly login.
 * 5. As platform admin, GET each cart by id using
 *    /shoppingMall/platformAdmin/customerCarts/{customerCartId}.
 * 6. Assert that:
 *
 *    - Cart A’s customer.id equals Customer A’s customer.id and not Customer B’s.
 *    - Cart B’s customer.id equals Customer B’s customer.id and not Customer A’s.
 */
export async function test_api_platform_admin_get_customer_cart_customer_mismatch_protection(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerAJoinHref: string & tags.Format<"uri"> =
    "https://customer-a.example.com/join" as string & tags.Format<"uri">;
  const customerAJoinReferrer: string & tags.Format<"uri"> =
    "https://customer-a.example.com/landing" as string & tags.Format<"uri">;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerAEmail,
        password: "password-A-1234",
        name: RandomGenerator.name(),
        ip: null,
        href: customerAJoinHref,
        referrer: customerAJoinReferrer,
      } satisfies IShoppingMallCustomerAuth.IJoin,
    });
  typia.assert(customerA);

  // 2. As Customer A, create Cart A
  const cartABody = {
    currency_code: "USD",
    region_code: "US-East",
    channel: "web",
    metadata: {
      source: "e2e-test",
      scenario: "customer-cart-ownership-A",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartABody,
      },
    );
  typia.assert(cartA);

  // 3. Register Customer B and create Cart B
  const customerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerBJoinHref: string & tags.Format<"uri"> =
    "https://customer-b.example.com/join" as string & tags.Format<"uri">;
  const customerBJoinReferrer: string & tags.Format<"uri"> =
    "https://customer-b.example.com/landing" as string & tags.Format<"uri">;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerBEmail,
        password: "password-B-1234",
        name: RandomGenerator.name(),
        ip: null,
        href: customerBJoinHref,
        referrer: customerBJoinReferrer,
      } satisfies IShoppingMallCustomerAuth.IJoin,
    });
  typia.assert(customerB);

  const cartBBody = {
    currency_code: "USD",
    region_code: "US-West",
    channel: "web",
    metadata: {
      source: "e2e-test",
      scenario: "customer-cart-ownership-B",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartB: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBBody,
      },
    );
  typia.assert(cartB);

  // 4. Register a platform admin and authenticate as admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinHref: string & tags.Format<"uri"> =
    "https://admin.example.com/join" as string & tags.Format<"uri">;
  const adminJoinReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com/landing" as string & tags.Format<"uri">;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "admin-password-1234",
        ip: null,
        href: adminJoinHref,
        referrer: adminJoinReferrer,
      } satisfies IShoppingMallPlatformAdminJoin.IRequest,
    });
  typia.assert(platformAdmin);

  // Explicit login as platform admin to simulate separate login flow
  const adminLoginHref: string & tags.Format<"uri"> =
    "https://admin.example.com/login" as string & tags.Format<"uri">;
  const adminLoginReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com/landing-login" as string & tags.Format<"uri">;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: "admin-password-1234",
        ip: null,
        href: adminLoginHref,
        referrer: adminLoginReferrer,
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    });
  typia.assert(platformAdminLogin);

  // 5. As platform admin, GET Cart A detail and verify ownership
  const adminViewCartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.platformAdmin.customerCarts.at(
      connection,
      {
        customerCartId: cartA.id,
      },
    );
  typia.assert(adminViewCartA);

  TestValidator.equals(
    "admin view of cart A has correct cart id",
    adminViewCartA.id,
    cartA.id,
  );
  TestValidator.equals(
    "admin view of cart A has customer A id",
    adminViewCartA.customer.id,
    customerA.customer.id,
  );
  TestValidator.notEquals(
    "admin view of cart A must not show customer B id",
    adminViewCartA.customer.id,
    customerB.customer.id,
  );

  // 6. As platform admin, GET Cart B detail and verify ownership
  const adminViewCartB: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.platformAdmin.customerCarts.at(
      connection,
      {
        customerCartId: cartB.id,
      },
    );
  typia.assert(adminViewCartB);

  TestValidator.equals(
    "admin view of cart B has correct cart id",
    adminViewCartB.id,
    cartB.id,
  );
  TestValidator.equals(
    "admin view of cart B has customer B id",
    adminViewCartB.customer.id,
    customerB.customer.id,
  );
  TestValidator.notEquals(
    "admin view of cart B must not show customer A id",
    adminViewCartB.customer.id,
    customerA.customer.id,
  );
}
