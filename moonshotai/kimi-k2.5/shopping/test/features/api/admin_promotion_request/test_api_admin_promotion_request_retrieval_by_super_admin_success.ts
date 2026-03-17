import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_retrieval_by_super_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as a customer
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Step 2: Create admin promotion request with valid reason
  const createBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEcommerceMallAdminPromotionRequest.ICreate;
  const createdRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      { body: createBody },
    );
  typia.assert(createdRequest);
  // Step 3: Retrieve the specific promotion request by ID
  const retrievedRequest =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.at(
      customerConnection,
      {
        promotionRequestId: createdRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Step 4: Validate response matches expected structure and values
  TestValidator.equals(
    "promotion request id matches",
    retrievedRequest.id,
    createdRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "reason matches submitted text",
    retrievedRequest.reason,
    createBody.reason,
  );
  TestValidator.equals(
    "rejectionReason is null",
    retrievedRequest.rejectionReason,
    null,
  );
  TestValidator.equals("reviewer is null", retrievedRequest.reviewer, null);
  TestValidator.equals(
    "requester id matches customer",
    retrievedRequest.requester.id,
    customer.id,
  );
}
