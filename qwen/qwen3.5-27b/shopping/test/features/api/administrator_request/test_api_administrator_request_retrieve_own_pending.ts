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
 * Test that a seller can retrieve their own pending administrator promotion request.
 *
 * Validates the complete flow of submitting and retrieving an administrator promotion request from a seller's perspective. Ensures that the request is created with correct initial state and can be retrieved by the seller who submitted it.
 *
 * Special attention is given to verifying that pending requests have null values for processed_by_administrator_id, processedByAdministrator, and rejection_reason fields, and that the actor_type correctly reflects the seller role.
 *
 * 1. Register a new seller account with randomized credentials.
 * 2. Submit an administrator promotion request with a justification reason.
 * 3. Retrieve the administrator request using the request ID from step 2.
 * 4. Validate all response fields match expected values for a pending request.
 */
export async function test_api_administrator_request_retrieve_own_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Submit administrator promotion request
  const request =
    await generate_random_shopping_mall_seller_administrator_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(request);
  // 3. Retrieve the administrator request
  const retrieved =
    await api.functional.shoppingMall.seller.administrator_requests.at(
      sellerConnection,
      {
        administratorRequestId: request.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate response fields
  TestValidator.equals("request id matches", retrieved.id, request.id);
  TestValidator.equals("actor type is seller", retrieved.actor_type, "seller");
  TestValidator.equals(
    "reason matches submitted",
    retrieved.reason,
    request.reason,
  );
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "rejection reason is null",
    retrieved.rejection_reason,
    null,
  );
  TestValidator.equals(
    "processed by admin id is null",
    retrieved.processed_by_administrator_id,
    null,
  );
  TestValidator.equals(
    "processed by admin is null",
    retrieved.processedByAdministrator,
    null,
  );
  TestValidator.predicate(
    "created at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrieved.created_at,
    ),
  );
  TestValidator.predicate(
    "updated at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrieved.updated_at,
    ),
  );
}
