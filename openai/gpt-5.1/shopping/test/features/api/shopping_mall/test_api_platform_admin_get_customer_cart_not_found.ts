import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate not-found behavior when a platform admin fetches a non-existent
 * customer cart.
 *
 * Business goal:
 *
 * - Ensure that the platform-admin-only cart detail endpoint does NOT silently
 *   succeed or return a misleading empty representation when the requested cart
 *   id does not exist. Instead, it must fail with an HTTP error that is handled
 *   by the global error pipeline.
 *
 * High-level flow:
 *
 * 1. Join as a new platform admin via POST /auth/platformAdmin/join using
 *    IShoppingMallPlatformAdminJoin.IRequest. The SDK will automatically
 *    propagate the access token into the connection headers.
 * 2. Optionally call the cart detail endpoint once with a random UUID just to
 *    exercise the success-path type (this is not required by the scenario but
 *    helps prove the endpoint wiring). We assert the response as
 *    IShoppingMallCustomerCart to confirm shape, but we do not depend on this
 *    for the not-found semantics.
 * 3. Construct a clearly artificial but valid UUID string (e.g. all zeros) and
 *    treat it as `string & tags.Format<"uuid">` via typia.assert. This value is
 *    extremely unlikely to map to a real row in shopping_mall_customer_carts.
 * 4. Use TestValidator.error with a descriptive title to ensure that calling
 *    api.functional.shoppingMall.platformAdmin.customerCarts.at with this
 *    nonexistent id throws an error (typically HttpError) instead of returning
 *    a normal IShoppingMallCustomerCart or succeeding silently.
 * 5. We deliberately do not assert the exact HTTP status code nor the error body
 *    shape, staying within the constraints that forbid status-code equality
 *    checks and deep error-body validation. The fact that an error occurs for a
 *    clearly bogus id is sufficient E2E evidence of correct not-found semantics
 *    from the test's perspective.
 */
export async function test_api_platform_admin_get_customer_cart_not_found(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin so that subsequent calls run under
  //    platformAdmin authorization context.
  const joinBody = {
    email: `admin+cart-not-found-${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Optionally probe the endpoint with a random UUID to exercise wiring.
  //    This mirrors the mock-up test and ensures the success-path type is sound
  //    even though we do not rely on it for not-found behavior.
  const probeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  try {
    const maybeCart: IShoppingMallCustomerCart =
      await api.functional.shoppingMall.platformAdmin.customerCarts.at(
        connection,
        {
          customerCartId: probeId,
        },
      );
    typia.assert(maybeCart);
  } catch {
    // If this fails (e.g. not-found), that's acceptable; it just means no cart
    // exists for the random probe UUID. We consciously ignore the error here
    // because this step is only for wiring validation, not an assertion
    // target.
  }

  // 3. Build an artificial but valid UUID string that should not exist.
  //    We use a fixed literal and validate it as a UUID using typia.assert so
  //    that it satisfies the required tagged type.
  const nonexistentId = typia.assert<string & tags.Format<"uuid">>(
    "00000000-0000-0000-0000-000000000000",
  );

  // 4. Assert that requesting this nonexistent id results in an error.
  await TestValidator.error(
    "platform admin get customer cart with non-existent id should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customerCarts.at(
        connection,
        {
          customerCartId: nonexistentId,
        },
      );
    },
  );
}
