import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function test_api_admin_promotion_request_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Step 2: Create promotion request with explicit reason
  const requestReason =
    "I have extensive experience in e-commerce management and want to help moderate the platform effectively.";
  const createdRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: requestReason,
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(createdRequest);
  const requestId = createdRequest.id;
  // Step 3: Retrieve the promotion request by ID
  const retrievedRequest =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.at(
      customerConnection,
      { requestId },
    );
  typia.assert(retrievedRequest);
  // Step 4: Validate field integrity
  TestValidator.equals(
    "id matches requested requestId",
    retrievedRequest.id,
    requestId,
  );
  TestValidator.equals(
    "status is pending for new request",
    retrievedRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reason matches submitted value",
    retrievedRequest.reason,
    requestReason,
  );
  TestValidator.equals(
    "reviewer is null (not reviewed)",
    retrievedRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "rejectionReason is null",
    retrievedRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "deletedAt is null (not soft-deleted)",
    retrievedRequest.deletedAt,
    null,
  );
}
