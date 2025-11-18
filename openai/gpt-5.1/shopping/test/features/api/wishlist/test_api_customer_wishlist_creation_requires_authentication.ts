import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Verify that customer wishlist creation is protected by authentication.
 *
 * Business goals:
 *
 * - Ensure POST /shoppingMall/customer/wishlists rejects unauthenticated calls
 *   and does not create any wishlist records when invoked without customer
 *   authentication.
 * - Ensure the same endpoint succeeds when called after a proper
 *   /auth/customer/join flow and that created wishlists are visible via the
 *   index (PATCH /shoppingMall/customer/wishlists) endpoint.
 *
 * High level flow:
 *
 * 1. Prepare a valid wishlist creation payload (IShoppingMallWishlist.ICreate) and
 *    a corresponding search filter payload (IShoppingMallWishlist.IRequest)
 *    that can later be used to locate that wishlist via index().
 * 2. Create an unauthenticated connection (empty headers) derived from the
 *    provided connection and attempt to create a wishlist with it, asserting
 *    that the call fails using TestValidator.error, proving that authentication
 *    is required for creation.
 * 3. Perform an authenticated customer join via api.functional.auth.customer.join
 *    using the original connection so that the SDK configures
 *    connection.headers.Authorization appropriately.
 * 4. With the now-authenticated connection, call index() to get the current
 *    wishlist count for the same filter, then successfully call
 *    api.functional.shoppingMall.customer.wishlists.create.
 * 5. Assert that the creation response matches the request payload and that the
 *    embedded customer.id matches the authenticated customer id.
 * 6. Call index() again and validate that:
 *
 *    - The wishlist count has increased by at least one compared to the
 *         authenticated pre-create count; and
 *    - At least one wishlist in the page has the same id as the created wishlist,
 *         proving it was persisted and is discoverable.
 */
export async function test_api_customer_wishlist_creation_requires_authentication(
  connection: api.IConnection,
) {
  // Step 1: Prepare a deterministic wishlist creation body
  const wishlistName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const wishlistStatus: string = "active";

  const createBody = {
    name: wishlistName,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    is_default: true,
    status: wishlistStatus,
  } satisfies IShoppingMallWishlist.ICreate;

  // Common listing filter focused on this name/status
  const listRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 100 as number & tags.Type<"int32">,
    search: wishlistName,
    status: wishlistStatus,
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IShoppingMallWishlist.IRequest;

  // Step 2: Create an unauthenticated connection with empty headers
  const anonymousConnection: api.IConnection = { ...connection, headers: {} };

  // Unauthenticated create must fail
  await TestValidator.error(
    "unauthenticated wishlist create should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.create(
        anonymousConnection,
        {
          body: createBody,
        },
      );
    },
  );

  // Step 3: Join as a new customer using the authenticated connection
  const joinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // Step 4: With authenticated connection, capture pre-create count
  const customerBeforePage: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: listRequestBody,
    });
  typia.assert(customerBeforePage);
  const customerBeforeCount: number = customerBeforePage.data.length;

  // Create wishlist as authenticated customer
  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBody,
    });
  typia.assert(createdWishlist);

  // Step 5: Validate response fields
  TestValidator.equals(
    "created wishlist name must match request body",
    createdWishlist.name,
    createBody.name,
  );
  TestValidator.equals(
    "created wishlist status must match request body",
    createdWishlist.status,
    wishlistStatus,
  );
  TestValidator.equals(
    "created wishlist is_default must match request body",
    createdWishlist.is_default,
    createBody.is_default ?? false,
  );

  // Created wishlist must belong to the authenticated customer
  TestValidator.equals(
    "created wishlist customer id must equal authorized customer id",
    createdWishlist.customer.id,
    authorizedCustomer.id,
  );

  // Step 6: Confirm wishlist is visible via index and count increased
  const customerAfterPage: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: listRequestBody,
    });
  typia.assert(customerAfterPage);
  const customerAfterCount: number = customerAfterPage.data.length;

  TestValidator.predicate(
    "authenticated wishlist create should increase or at least not decrease visible count",
    customerAfterCount >= customerBeforeCount + 1,
  );

  const found = customerAfterPage.data.some(
    (summary) => summary.id === createdWishlist.id,
  );
  TestValidator.predicate(
    "created wishlist must appear in paginated index results",
    found,
  );
}
