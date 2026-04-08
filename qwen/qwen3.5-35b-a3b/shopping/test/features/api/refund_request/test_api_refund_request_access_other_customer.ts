import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a customer cannot retrieve another customer's refund request.
 *
 * Validates the ownership check mechanism that ensures customers can only
 * access their own refund requests, preventing unauthorized access to other
 * customers' data. The test creates two customer accounts and verifies that
 * customer A cannot retrieve a refund request belonging to customer B.
 *
 * The refund request access endpoint enforces strict ownership validation
 * by checking that the authenticated customer matches the order item's
 * customer ID. When a mismatch occurs, the system returns 404 Not Found
 * rather than revealing that the resource exists.
 *
 * 1. Create customer A account with randomized credentials
 * 2. Create customer B account with different credentials
 * 3. Use a refund request ID known to belong to customer B
 * 4. Attempt retrieval using customer A's authentication context
 * 5. Verify 404 Not Found is returned
 */
export async function test_api_refund_request_access_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer A account
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_member_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerA);
  // 2. Create customer B account
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_member_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerB);
  // 3. Use a refund request ID that belongs to customer B (pre-created by test setup)
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Customer A attempts to retrieve customer B's refund request - should get 404
  await TestValidator.error(
    "should return 404 for other customer's refund request",
    async () => {
      await api.functional.ecommerceMall.member.customer.refund_requests.at(
        customerAConnection,
        { requestId },
      );
    },
  );
}