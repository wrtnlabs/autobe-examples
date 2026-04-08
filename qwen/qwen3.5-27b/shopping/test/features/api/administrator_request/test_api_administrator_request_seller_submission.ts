import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test that a registered seller can successfully submit an administrator promotion request with a valid reason.
 *
 * Validates the complete administrator request submission flow for sellers. Ensures that sellers can request administrator privileges by providing a justification reason, and that the request is created with correct status and metadata.
 *
 * Special attention is given to verifying that the request is properly linked to the seller account and that the initial status is 'pending' awaiting super administrator review.
 *
 * 1. Register a new seller account with valid email and password
 * 2. Authenticate the seller with login credentials
 * 3. Submit an administrator request with a meaningful reason text explaining qualifications
 * 4. Verify the request is created with actor_type 'seller', status 'pending', and null processed_by_administrator_id
 * 5. Confirm all expected fields are present with correct values in the response
 */
export async function test_api_administrator_request_seller_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Authenticate the seller with login credentials
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_login(authenticatedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Submit an administrator request with a meaningful reason
  const reason = RandomGenerator.paragraph({ sentences: 5 });
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      authenticatedSellerConnection,
      {
        body: {
          reason: reason,
        },
      },
    );
  // 4. Validate the request response
  typia.assert(request);
  // 5. Verify actor_type is 'seller'
  TestValidator.equals("actor type is seller", request.actor_type, "seller");
  // 6. Verify status is 'pending'
  TestValidator.equals("status is pending", request.status, "pending");
  // 7. Verify reason matches submitted text
  TestValidator.equals("reason matches input", request.reason, reason);
  // 8. Verify processed_by_administrator_id is null (not yet processed)
  TestValidator.equals(
    "processed_by_administrator_id is null",
    request.processed_by_administrator_id,
    null,
  );
  // 9. Verify rejection_reason is null (not rejected)
  TestValidator.equals(
    "rejection_reason is null",
    request.rejection_reason,
    null,
  );
  // 10. Verify processedByAdministrator is null (not yet processed)
  TestValidator.equals(
    "processedByAdministrator is null",
    request.processedByAdministrator,
    null,
  );
}
