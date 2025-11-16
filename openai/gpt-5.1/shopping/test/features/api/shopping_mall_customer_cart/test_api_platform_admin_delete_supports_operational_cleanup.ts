import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCart";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validate that platform admin cart deletion supports operational cleanup
 * workflows.
 *
 * Business goal: Ensure that a platform administrator can search for customer
 * carts using header-level filters, delete selected carts using the admin
 * DELETE endpoint, and then verify through a subsequent search that those carts
 * are no longer returned while other carts remain unaffected.
 *
 * High-level steps:
 *
 * 1. Prepare data by creating multiple customers and for each customer create one
 *    or more carts with varying `is_active` flags.
 * 2. Register a platform administrator and authenticate as that admin.
 * 3. As admin, search for carts that match a specific cleanup criterion (e.g.,
 *    inactive carts) using the PATCH index endpoint.
 * 4. From the search results, choose at least one cart and delete it via the admin
 *    DELETE endpoint.
 * 5. Re-run the same search and verify that deleted carts are no longer returned
 *    while other carts still exist.
 */
export async function test_api_platform_admin_delete_supports_operational_cleanup(
  connection: api.IConnection,
) {
  // Helper to create a random customer and one or more carts.
  const createCustomerWithCarts = async (
    baseConnection: api.IConnection,
    cartCount: number,
  ): Promise<{
    customer: IShoppingMallCustomer.IAuthorized;
    carts: IShoppingMallCustomerCart[];
  }> => {
    const email: string & tags.Format<"email"> = typia.random<
      string & tags.Format<"email">
    >();

    const joinBody = {
      email,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      // Optional ip can be undefined; href/referrer must be valid URIs.
      ip: null,
      href: "https://customer.example.com/join",
      referrer: "https://customer.example.com/landing",
    } satisfies IShoppingMallCustomerAuth.IJoin;

    const customer = await api.functional.auth.customer.join(baseConnection, {
      body: joinBody,
    });
    typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

    // Now the shared connection is authenticated as this customer because
    // join() sets connection.headers.Authorization.
    const carts: IShoppingMallCustomerCart[] = [];
    for (let i = 0; i < cartCount; i++) {
      const createBody = {
        currency_code: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
        region_code: RandomGenerator.pick([
          "US-East",
          "EU-West",
          "KR-Seoul",
        ] as const),
        channel: RandomGenerator.pick([
          "web",
          "mobile_web",
          "mobile_app",
        ] as const),
        metadata: {
          source: "e2e-test",
        },
        // Alternate active/inactive based on index so admin filters can
        // distinguish them later.
        is_active: i % 2 === 0,
        source_guest_token: undefined,
      } satisfies IShoppingMallCustomerCart.ICreate;

      const cart =
        await api.functional.shoppingMall.customer.customerCarts.create(
          baseConnection,
          {
            body: createBody,
          },
        );
      typia.assert<IShoppingMallCustomerCart>(cart);
      carts.push(cart);
    }

    return { customer, carts };
  };

  // 1. Prepare dataset: multiple customers each with at least one cart.
  const customersWithCarts: {
    customer: IShoppingMallCustomer.IAuthorized;
    carts: IShoppingMallCustomerCart[];
  }[] = [];

  // Create two customers to have variety of ownership.
  customersWithCarts.push(await createCustomerWithCarts(connection, 3));
  customersWithCarts.push(await createCustomerWithCarts(connection, 2));

  // 2. Register a platform admin and authenticate as that admin.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 3. As platform admin, search for carts that match cleanup criteria.
  // We'll target inactive carts (is_active === false).
  const searchBodyBefore = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    is_active: false,
    include_deleted: false,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const pageBefore =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      {
        body: searchBodyBefore,
      },
    );
  typia.assert<IPageIShoppingMallCustomerCart.ISummary>(pageBefore);

  const inactiveBefore: IShoppingMallCustomerCart.ISummary[] = pageBefore.data;

  TestValidator.predicate(
    "there should be at least one inactive cart before cleanup",
    inactiveBefore.length > 0,
  );

  // Pick a subset of carts to delete; ensure we delete at least one.
  const cartsToDelete: IShoppingMallCustomerCart.ISummary[] =
    inactiveBefore.slice(0, Math.min(2, inactiveBefore.length));

  // 4. Delete the selected carts via the admin DELETE endpoint.
  for (const summary of cartsToDelete) {
    await api.functional.shoppingMall.platformAdmin.customerCarts.erase(
      connection,
      {
        customerCartId: summary.id,
      },
    );
  }

  // 5. Re-run the same search and verify deleted carts no longer appear.
  const pageAfter =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      {
        body: searchBodyBefore,
      },
    );
  typia.assert<IPageIShoppingMallCustomerCart.ISummary>(pageAfter);

  const inactiveAfter: IShoppingMallCustomerCart.ISummary[] = pageAfter.data;

  // Ensure count of inactive carts has decreased or at least those IDs are gone.
  TestValidator.predicate(
    "inactive cart count should not increase after deletions",
    inactiveAfter.length <= inactiveBefore.length,
  );

  for (const deleted of cartsToDelete) {
    const stillExists = inactiveAfter.some((c) => c.id === deleted.id);
    TestValidator.predicate(
      "deleted cart should not appear in inactive search results",
      !stillExists,
    );
  }

  // 6. Verify that some carts (likely active ones) still exist overall.
  const searchActiveBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    is_active: true,
    include_deleted: false,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const pageActive =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      {
        body: searchActiveBody,
      },
    );
  typia.assert<IPageIShoppingMallCustomerCart.ISummary>(pageActive);

  TestValidator.predicate(
    "there should still be at least one active cart after cleanup",
    pageActive.data.length > 0,
  );
}
