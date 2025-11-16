import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_seller_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register a new seller to ensure the system is in a valid, operational state.
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinBody = {
    email: sellerEmail,
    password: "StrongP@ssw0rd!",
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // Basic business sanity checks on join response.
  TestValidator.predicate(
    "joined seller email should match request email",
    authorizedSeller.email === joinBody.email,
  );
  TestValidator.predicate(
    "joined seller store_name should not be empty",
    authorizedSeller.store_name.length > 0,
  );

  // 2. Exercise normal behavior of seller email verification issue.
  const issueBody = {
    email: sellerEmail,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const issueResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: issueBody,
      },
    );
  typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(
    issueResponse,
  );

  TestValidator.predicate(
    "seller email verification issue should indicate success",
    issueResponse.success === true,
  );

  // 3. Generate a random UUID to represent a non-existent seller ID.
  //    Probability of collision with the just-created seller is negligible,
  //    and we additionally assert they differ for conceptual clarity.
  const unknownSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  TestValidator.predicate(
    "unknown sellerId should differ from the real seller id",
    authorizedSeller.id !== unknownSellerId,
  );

  // 4. Call seller detail endpoint with an unknown sellerId while authenticated,
  //    expecting the call to fail (not-found or equivalent business error).
  await TestValidator.error(
    "unknown sellerId should not resolve even for authenticated seller context",
    async () => {
      await api.functional.shoppingMall.sellers.at(connection, {
        sellerId: unknownSellerId,
      });
    },
  );

  // 5. Create an anonymous (unauthenticated) connection to validate that the
  //    not-found behavior is consistent for public access as well.
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unknown sellerId should also fail for anonymous caller",
    async () => {
      await api.functional.shoppingMall.sellers.at(anonymousConnection, {
        sellerId: unknownSellerId,
      });
    },
  );
}
