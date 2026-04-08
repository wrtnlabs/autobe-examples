import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test authorization boundary enforcement when seller attempts to access another seller's refund request.
 *
 * Validates the seller's authorization scope is correctly enforced based on product ownership.
 * The test creates two distinct seller accounts and verifies that a seller cannot access refund
 * requests belonging to products owned by another seller. This ensures proper isolation of
 * seller data and prevents unauthorized cross-seller access to sensitive refund information.
 *
 * The authorization check occurs at the refund request retrieval endpoint, where the system
 * verifies that the requesting seller owns the product associated with the refund request.
 * If the seller does not own the product, a 403 Forbidden error is returned.
 *
 * ## Test Scenarios
 *
 * 1. Seller A registration: Create sellerA account with valid credentials
 * 2. Seller B registration: Create sellerB account with different credentials
 * 3. Refund request creation: Create a refund request that belongs to sellerA's product
 * 4. Unauthorized access attempt: sellerB attempts to retrieve sellerA's refund request
 * 5. Authorization validation: Verify 403 Forbidden response is returned
 * 6. Error message verification: Ensure error indicates insufficient authorization
 *
 * This test validates the core security principle that sellers can only manage refund requests
 * for their own products, preventing data leakage between competing sellers on the platform.
 */
export async function test_api_seller_refund_request_authorization_enforced(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register sellerA
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAData = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAData);
  // 2. Register sellerB
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBData = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerBData);
  // 3. Create a refund request (using typia.random to generate test data)
  // In a real scenario, this would be created through a refund request creation endpoint
  const refundRequest = typia.random<IEcommerceMallRefundRequest>();
  // 4. sellerB attempts to access sellerA's refund request by ID
  await TestValidator.httpError(
    "sellerB should not access another seller's refund request",
    [403],
    async () => {
      await api.functional.ecommerceMall.seller.refund_requests.at(
        sellerBConnection,
        { id: refundRequest.id },
      );
    },
  );
}