import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_rejection_reason_not_available_when_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with 'pending' status
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const registeredSeller = await authorize_seller_join(
    sellerJoinConnection,
    {},
  );
  typia.assert(registeredSeller);
  // 2. Create authenticated connection using the token from registration
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${registeredSeller.token.access}`,
    },
  };
  // 3. Call GET /ecommerceMall/seller/sellers/rejection-reason
  const rejectionReasonResponse =
    await api.functional.ecommerceMall.seller.sellers.rejection_reason.at(
      sellerConnection,
    );
  typia.assert(rejectionReasonResponse);
  // 4. Validate response - seller is still pending, no rejection reason available
  TestValidator.equals(
    "approval status is pending",
    rejectionReasonResponse.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "rejection reason is null for pending seller",
    rejectionReasonResponse.rejectionReason,
    null,
  );
  TestValidator.equals(
    "rejected at is null for pending seller",
    rejectionReasonResponse.rejectedAt,
    null,
  );
}
