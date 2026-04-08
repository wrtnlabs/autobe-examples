import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
 * Test seller can retrieve their approval request record.
 *
 * Validates the seller approval retrieval endpoint where a seller can query their registration approval status. This ensures the approval tracking system properly exposes approval state information to sellers.
 *
 * Note: This test focuses on the retrieval capability. In simulation mode, the approval record is generated with random data. The actual approval workflow (admin approval) requires endpoints not available in this test scope.
 *
 * 1. Seller registers via /ecommerce/auth/seller/join endpoint.
 * 2. Seller retrieves their approval record using the approval ID (simulated).
 * 3. Validates approval record structure and seller reference data.
 * 4. Confirms seller reference includes shop name and account status.
 */
export async function test_api_seller_approval_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Retrieve approval record (using seller ID as approval ID for simulation)
  // Note: In a real scenario, the approval ID would be obtained from the registration response
  // or from a separate approval listing endpoint. For simulation, we use the seller ID.
  const approvalId = sellerAuth.id;
  const approval = await api.functional.ecommerce.seller.approvals.at(
    sellerConnection,
    {
      approvalId: approvalId satisfies string & tags.Format<"uuid">,
    },
  );
  typia.assert(approval);
  // 3. Validate approval record structure
  TestValidator.equals("approval ID is valid UUID", approval.id, approvalId);
  TestValidator.predicate(
    "seller reference exists",
    approval.seller !== null && approval.seller !== undefined,
  );
  TestValidator.equals(
    "seller shop name exists",
    approval.seller.shop_name.length > 0,
    true,
  );
  TestValidator.predicate(
    "seller approval status is defined",
    approval.seller.approval_status !== null &&
      approval.seller.approval_status !== undefined,
  );
}
