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

export async function test_api_admin_promotion_request_submit_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Prepare promotion request with valid reason
  const reasonText = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 10,
    wordMax: 15,
  });
  const requestBody = {
    reason: reasonText,
  } satisfies IEcommerceMallAdminPromotionRequest.ICreate;
  // Step 3: Submit the admin promotion request
  const response =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.create(
      customerConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // Step 4: Business logic validations (typia.assert already validated types)
  TestValidator.equals(
    "status should be pending for new request",
    response.status,
    "pending",
  );
  TestValidator.equals(
    "reason should match submitted value",
    response.reason,
    reasonText,
  );
  TestValidator.equals(
    "reviewer should be null for unreviewed request",
    response.reviewer,
    null,
  );
  TestValidator.equals(
    "rejectionReason should be null",
    response.rejectionReason,
    null,
  );
  TestValidator.equals(
    "deletedAt should be null for active request",
    response.deletedAt,
    null,
  );
  // Validate polymorphic requester is a customer (has recipientName which is unique to IEcommerceMallCustomer)
  TestValidator.predicate(
    "requester should be a customer",
    "recipientName" in response.requester,
  );
}
