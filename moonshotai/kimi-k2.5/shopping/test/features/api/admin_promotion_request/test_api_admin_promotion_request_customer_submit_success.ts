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

export async function test_api_admin_promotion_request_customer_submit_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Prepare a valid reason with Unicode characters (edge case validation)
  // Satisfies: min 10 chars, max 1000 chars, contains Unicode
  const testReason =
    "I have extensive e-commerce management experience and want to help improve the platform. 我有丰富经验，愿为平台发展贡献力量。🔧" satisfies IEcommerceMallAdminPromotionRequest.ICreate["reason"];
  // 3. Submit promotion request using generation utility (handles record creation)
  const request =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: testReason,
        },
      },
    );
  // 4. Validate complete response structure using typia (validates all DTO properties)
  typia.assert(request);
  // 5. Business logic validation - verify initial state
  TestValidator.equals("status should be pending", request.status, "pending");
  TestValidator.equals(
    "reason should be preserved exactly",
    request.reason,
    testReason,
  );
  TestValidator.equals(
    "reviewer should be null initially",
    request.reviewer,
    null,
  );
  TestValidator.equals(
    "rejectionReason should be null initially",
    request.rejectionReason,
    null,
  );
  TestValidator.equals(
    "deletedAt should be null initially",
    request.deletedAt,
    null,
  );
  // 6. Validate requester type is customer (IEcommerceMallCustomer has streetAddress, IEcommerceMallSeller has approvalStatus)
  TestValidator.predicate(
    "requester should be customer type",
    () => "streetAddress" in request.requester,
  );
}
