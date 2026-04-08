import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the primary success path of rejecting a pending seller registration with a rejection reason.
 *
 * Validates the complete seller rejection workflow including administrator authentication, seller registration, and rejection with reason storage. Ensures that when an administrator rejects a pending seller application, the seller's approval status changes to 'rejected' and the rejection reason is properly stored and returned in the response.
 *
 * Special attention is given to verifying that the rejection reason is correctly persisted and that the seller account state transitions from 'pending' to 'rejected' as expected.
 *
 * 1. Administrator registers and authenticates to the system.
 * 2. A new seller registers, creating an account with 'pending' approval status.
 * 3. Administrator rejects the seller registration with a detailed rejection reason.
 * 4. Validates the rejection response contains the updated seller with 'rejected' status and the rejection reason.
 * 5. Verifies the seller's approval_status is 'rejected' and rejection_reason is populated.
 */
export async function test_api_seller_approval_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller registration (creates account with 'pending' status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // Verify seller is in pending status
  TestValidator.equals(
    "seller initial status is pending",
    seller.approval_status,
    "pending",
  );
  // 3. Administrator rejects the seller
  const rejectionReason =
    "Seller application does not meet our quality standards. Please provide additional documentation about your business.";
  const rejectedSeller =
    await api.functional.shoppingMall.administrator.sellers.reject(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          rejectionReason,
        } satisfies IShoppingMallSeller.IReject,
      },
    );
  typia.assert(rejectedSeller);
  // 4. Validate rejection response
  TestValidator.equals(
    "seller status changed to rejected",
    rejectedSeller.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason is stored",
    rejectedSeller.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejection reason is not null",
    rejectedSeller.rejection_reason !== null,
  );
  TestValidator.predicate(
    "rejection reason is not empty",
    rejectedSeller.rejection_reason!.length > 0,
  );
}
