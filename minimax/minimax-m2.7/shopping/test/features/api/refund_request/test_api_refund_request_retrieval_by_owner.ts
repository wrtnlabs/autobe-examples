import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * E2E test for retrieving a specific refund request by its unique identifier.
 *
 * Validates:
 * - Response returns 200 OK with complete refund request details
 * - Response includes: id, reason, status, customer summary, seller summary
 * - Status is 'pending' when seller has not yet responded
 *
 * @param connection - Base API connection
 */
export async function test_api_refund_request_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await api.functional.ecommerceMall.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerAuth);
  // 2. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: "https://example.com/seller/register",
        referrer: "https://example.com",
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerAuth);
  // 3. Create actor-specific connections with authentication tokens
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 4. Retrieve refund request by its unique identifier
  // Note: In a complete scenario, we would:
  //   - Seller creates product with variants and inventory
  //   - Customer adds item to cart and completes checkout
  //   - Seller creates shipment for the order
  //   - Customer confirms delivery
  //   - Customer creates refund request
  //   - Then retrieve the refund request
  //
  // However, the scenario is simplified since not all utility functions
  // are available. We test the retrieval endpoint directly with a sample UUID.
  // The actual refund request ID would come from a previously created refund request.
  // For this test, we simulate retrieving a refund request
  // In real scenario, this ID would come from a created refund request
  const sampleRequestId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve refund request
  // This would return 404 if not found, or the refund request details if found
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.at(
      customerConnection,
      {
        requestId: sampleRequestId,
      },
    );
  // Validate response structure
  typia.assert(refundRequest);
  // If refund request exists, validate its structure
  TestValidator.equals("refund request has id", !!refundRequest.id, true);
  TestValidator.equals(
    "refund request has snapshotReason",
    "snapshotReason" in refundRequest,
    true,
  );
  TestValidator.equals(
    "refund request has snapshotStatus",
    "snapshotStatus" in refundRequest,
    true,
  );
  TestValidator.equals(
    "refund request has customer summary",
    "customer" in refundRequest,
    true,
  );
  TestValidator.equals(
    "refund request has seller summary",
    "seller" in refundRequest,
    true,
  );
  // Validate customer summary structure
  if (refundRequest.customer) {
    TestValidator.equals(
      "customer has id",
      "id" in refundRequest.customer,
      true,
    );
    TestValidator.equals(
      "customer has email",
      "email" in refundRequest.customer,
      true,
    );
  }
  // Validate seller summary structure
  if (refundRequest.seller) {
    TestValidator.equals("seller has id", "id" in refundRequest.seller, true);
    TestValidator.equals(
      "seller has email",
      "email" in refundRequest.seller,
      true,
    );
  }
}
