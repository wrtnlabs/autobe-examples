import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_seller_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test that a seller can retrieve their own rejected administrator promotion request and see the rejection reason.
 *
 * Validates the complete administrator request rejection workflow including seller registration, request submission, super administrator rejection, and seller retrieval of the rejected request. Ensures that the rejection reason and processing administrator information are correctly populated and accessible to the original requestor.
 *
 * Special attention is given to verifying that the seller can only access their own request, that the rejection reason provided by the super administrator is properly stored and returned, and that the processedByAdministrator relationship correctly links to the super administrator who handled the rejection.
 *
 * 1. Register a new seller account with email and password credentials.
 * 2. Submit an administrator promotion request with a justification reason.
 * 3. Register a new super administrator account.
 * 4. As the super administrator, reject the administrator request with a specific rejection reason.
 * 5. Re-authenticate the seller with the original credentials.
 * 6. Retrieve the administrator request using the request ID.
 * 7. Validate all response fields including rejection reason and processing administrator information.
 */
export async function test_api_administrator_request_retrieve_own_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with known credentials
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // 2. Submit an administrator promotion request
  const requestReason: string = RandomGenerator.paragraph({ sentences: 3 });
  const adminRequest =
    await generate_random_shopping_mall_seller_administrator_requests_create(
      sellerConnection,
      {
        body: {
          reason: requestReason,
        },
      },
    );
  typia.assert(adminRequest);
  // 3. Register a new super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 4. Reject the administrator request as super administrator
  const rejectionReason: string =
    "Application rejected due to insufficient experience and qualifications.";
  const updatedRequest =
    await api.functional.shoppingMall.administrator.administrator_requests.update(
      adminConnection,
      {
        administratorRequestId: adminRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Re-authenticate the seller with stored credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 6. Retrieve the administrator request as seller
  const retrievedRequest =
    await api.functional.shoppingMall.seller.administrator_requests.at(
      sellerLoginConnection,
      {
        administratorRequestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 7. Validate response fields
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "actor type is seller",
    retrievedRequest.actor_type,
    "seller",
  );
  TestValidator.equals(
    "reason matches original",
    retrievedRequest.reason,
    requestReason,
  );
  TestValidator.equals(
    "status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    retrievedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.equals(
    "processed by administrator ID",
    retrievedRequest.processed_by_administrator_id,
    adminAuth.id,
  );
  TestValidator.predicate(
    "processed by administrator exists",
    retrievedRequest.processedByAdministrator !== null,
  );
  if (retrievedRequest.processedByAdministrator !== null) {
    TestValidator.equals(
      "processed by administrator ID matches",
      retrievedRequest.processedByAdministrator.id,
      adminAuth.id,
    );
    TestValidator.equals(
      "processed by administrator email matches",
      retrievedRequest.processedByAdministrator.email,
      adminAuth.email,
    );
  }
  TestValidator.predicate(
    "created_at exists",
    retrievedRequest.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedRequest.updated_at !== null,
  );
}
