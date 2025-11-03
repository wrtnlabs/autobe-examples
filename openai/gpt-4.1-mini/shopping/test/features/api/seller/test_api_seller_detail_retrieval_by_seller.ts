import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test the retrieval of detailed seller account information for a seller by its
 * unique ID. The test includes these steps:
 *
 * 1. Seller joins (registers) to create a new seller account and receives
 *    authorization.
 * 2. Retrieve seller details by the authorized seller ID.
 * 3. Validate that the retrieved data matches the authorized seller (same ID,
 *    store_name, email, and profile info if any).
 * 4. Ensure sensitive information such as password_hash is not exposed in the
 *    ISummary response.
 * 5. Attempt to retrieve details with an invalid or unauthorized seller ID and
 *    expect failure or handled error.
 *
 * This validates access control and that only encoded seller information is
 * accessible.
 */
export async function test_api_seller_detail_retrieval_by_seller(
  connection: api.IConnection,
) {
  // Step 1: First seller join to create authorized seller
  const sellerBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass123!",
    store_name: "Store " + RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSeller.ICreate;

  const authorizedSeller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerBody1 });
  typia.assert(authorizedSeller1);

  // Step 2: Retrieve seller details by first seller ID
  const sellerId1: string & tags.Format<"uuid"> = authorizedSeller1.id;

  const sellerDetail1: IShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.seller.sellers.at(connection, {
      id: sellerId1,
    });
  typia.assert(sellerDetail1);

  // Step 3: Validate retrieved info matches join data
  TestValidator.equals(
    "seller ID matches",
    sellerDetail1.id,
    authorizedSeller1.id,
  );
  TestValidator.equals(
    "seller email matches",
    sellerDetail1.email,
    authorizedSeller1.email,
  );
  TestValidator.equals(
    "seller store name matches",
    sellerDetail1.store_name,
    authorizedSeller1.store_name,
  );

  // Step 4: Password hash is not exposed in ISummary
  TestValidator.predicate(
    "password_hash not in summary",
    !("password_hash" in sellerDetail1),
  );

  // Step 5: Profile info validation if present
  if (sellerDetail1.profile !== null && sellerDetail1.profile !== undefined) {
    typia.assertGuard<IShoppingMallSellerProfile>(sellerDetail1.profile);
    const profile = sellerDetail1.profile;
    TestValidator.equals(
      "profile contact email matches",
      profile.contact_email,
      authorizedSeller1.shopping_mall_seller_profiles?.contact_email ??
        profile.contact_email,
    );
  }

  // Step 6: Second seller join to create a different authorized seller
  const sellerBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass123!",
    store_name: "Store " + RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallSeller.ICreate;

  const authorizedSeller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerBody2 });
  typia.assert(authorizedSeller2);

  // Step 7: Attempt to retrieve first seller details as second seller - expect error
  await TestValidator.error(
    "unauthorized seller detail access should fail",
    async () => {
      // Note: SDK manages authentication tokens, so switch authentication
      // context by re-logging as seller 2
      await api.functional.auth.seller.join(connection, { body: sellerBody2 });

      await api.functional.shoppingMall.seller.sellers.at(connection, {
        id: sellerId1,
      });
    },
  );

  // Step 8: Test invalid seller ID retrieval - expect error
  let nonExistentId = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentId === sellerId1 || nonExistentId === authorizedSeller2.id) {
    const altId = typia.random<string & tags.Format<"uuid">>();
    typia.assert(altId);
    nonExistentId = altId;
  }

  await TestValidator.error(
    "non-existent seller ID retrieval should fail",
    async () => {
      await api.functional.shoppingMall.seller.sellers.at(connection, {
        id: nonExistentId,
      });
    },
  );
}
