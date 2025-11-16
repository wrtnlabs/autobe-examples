import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_seller_detail_retrieval_after_email_verification_issue(
  connection: api.IConnection,
) {
  // 1. Register a new seller to obtain an authenticated seller context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // Basic sanity checks on the authorized seller payload
  TestValidator.equals(
    "authorized seller id must be non-empty uuid",
    authorizedSeller.id,
    authorizedSeller.seller.id,
  );
  TestValidator.equals(
    "authorized seller email matches join email",
    authorizedSeller.email,
    joinBody.email,
  );
  TestValidator.equals(
    "authorized seller summary email matches join email",
    authorizedSeller.seller.email,
    joinBody.email,
  );
  TestValidator.equals(
    "authorized seller store_name matches join storeName",
    authorizedSeller.store_name,
    joinBody.storeName,
  );

  const sellerId = authorizedSeller.id;
  const sellerEmail = authorizedSeller.email;

  // 2. Issue an email verification for the seller
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
    "email verification issuance success flag should be true",
    issueResponse.success === true,
  );
  TestValidator.predicate(
    "email verification message should be non-empty",
    issueResponse.message.length > 0,
  );

  // 3. Retrieve seller detail in authenticated context
  const authedSellerDetail: IShoppingMallSeller =
    await api.functional.shoppingMall.sellers.at(connection, {
      sellerId,
    });
  typia.assert<IShoppingMallSeller>(authedSellerDetail);

  TestValidator.equals(
    "authed detail id matches authorized seller id",
    authedSellerDetail.id,
    sellerId,
  );
  TestValidator.equals(
    "authed detail email matches seller email",
    authedSellerDetail.email,
    sellerEmail,
  );
  TestValidator.equals(
    "authed detail store_name matches authorized seller store_name",
    authedSellerDetail.store_name,
    authorizedSeller.store_name,
  );
  TestValidator.equals(
    "authed detail status matches authorized seller status",
    authedSellerDetail.status,
    authorizedSeller.status,
  );

  // 4. Retrieve seller detail in an unauthenticated context
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const publicSellerDetail: IShoppingMallSeller =
    await api.functional.shoppingMall.sellers.at(unauthenticatedConnection, {
      sellerId,
    });
  typia.assert<IShoppingMallSeller>(publicSellerDetail);

  // 5. Validate that authenticated and public details are identical for core fields
  TestValidator.equals(
    "public detail id matches authed detail id",
    publicSellerDetail.id,
    authedSellerDetail.id,
  );
  TestValidator.equals(
    "public detail email matches authed detail email",
    publicSellerDetail.email,
    authedSellerDetail.email,
  );
  TestValidator.equals(
    "public detail store_name matches authed detail store_name",
    publicSellerDetail.store_name,
    authedSellerDetail.store_name,
  );
  TestValidator.equals(
    "public detail status matches authed detail status",
    publicSellerDetail.status,
    authedSellerDetail.status,
  );
  TestValidator.equals(
    "public detail created_at matches authed detail created_at",
    publicSellerDetail.created_at,
    authedSellerDetail.created_at,
  );
  TestValidator.equals(
    "public detail updated_at matches authed detail updated_at",
    publicSellerDetail.updated_at,
    authedSellerDetail.updated_at,
  );
  TestValidator.equals(
    "public detail deleted_at matches authed detail deleted_at",
    publicSellerDetail.deleted_at ?? null,
    authedSellerDetail.deleted_at ?? null,
  );

  // 6. Ensure issuing verification did not corrupt core fields
  TestValidator.equals(
    "authed detail email remains equal to join email after verification",
    authedSellerDetail.email,
    joinBody.email,
  );
  TestValidator.equals(
    "authed detail store_name remains equal to join storeName after verification",
    authedSellerDetail.store_name,
    joinBody.storeName,
  );
}
