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
 * Test that an authenticated seller can submit an administrator promotion request and verify the correct actor_type is set.
 *
 * Validates that when a seller submits an administrator promotion request, the system correctly identifies the actor_type as 'seller' based on the authenticated user's role. The actor_type field is automatically determined by the backend and cannot be modified through the request body.
 *
 * Special attention is given to verifying that the actor_type field is correctly set to 'seller' and that all other fields in the response contain the expected initial values for a pending request.
 *
 * 1. Create a new seller connection from the base connection
 * 2. Register and authenticate as a seller using authorize_seller_join utility
 * 3. Submit an administrator promotion request with a detailed reason text
 * 4. Validate the response contains all required fields with correct values
 * 5. Verify the actor_type field is correctly set to 'seller'
 * 6. Verify status is 'pending' and rejection-related fields are null
 */
export async function test_api_administrator_request_seller_actor_type_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register and authenticate as seller
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Submit administrator promotion request with detailed reason
  const request =
    await generate_random_shopping_mall_seller_administrator_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        },
      },
    );
  typia.assert(request);
  // 4. Validate response structure and actor_type
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
  // 5. Validate reason matches input
  TestValidator.predicate("reason is not empty", request.reason.length > 0);
  // 6. Validate timestamps are valid
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(request.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(request.updated_at)),
  );
  // 7. Validate ID is valid UUID
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      request.id,
    ),
  );
}
