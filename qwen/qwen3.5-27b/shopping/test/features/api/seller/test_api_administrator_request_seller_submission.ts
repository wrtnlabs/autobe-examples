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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_seller_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test seller administrator promotion request submission workflow.
 *
 * Validates that an authenticated seller can submit a request to become an administrator on the shopping mall platform. The test verifies the complete flow from seller registration through administrator request creation, ensuring all response fields are correctly populated with initial pending status values.
 *
 * Special attention is given to verifying that the actor_type is automatically determined as 'seller' from the authenticated user's role, and that all null fields (rejection_reason, processed_by_administrator_id, processedByAdministrator) are correctly initialized for pending requests.
 *
 * 1. Register and authenticate as a seller with randomized credentials using authorize_seller_join utility.
 * 2. Submit an administrator promotion request with a meaningful justification reason using generate_random_shopping_mall_seller_administrator_requests_create utility.
 * 3. Validate the response contains all required fields with correct types and initial values for a pending request.
 * 4. Verify the actor_type is correctly set to 'seller' based on the authenticated user's role.
 * 5. Verify all null fields are correctly initialized for unprocessed requests.
 */
export async function test_api_administrator_request_seller_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Submit administrator promotion request
  const request =
    await generate_random_shopping_mall_seller_administrator_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(request);
  // 3. Validate response structure and initial values
  TestValidator.equals("actor_type is seller", request.actor_type, "seller");
  TestValidator.equals("status is pending", request.status, "pending");
  TestValidator.equals(
    "rejection_reason is null",
    request.rejection_reason,
    null,
  );
  TestValidator.equals(
    "processed_by_administrator_id is null",
    request.processed_by_administrator_id,
    null,
  );
  TestValidator.equals(
    "processedByAdministrator is null",
    request.processedByAdministrator,
    null,
  );
  TestValidator.predicate(
    "reason is non-empty string",
    request.reason.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(request.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(request.updated_at)),
  );
}
