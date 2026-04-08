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

export async function test_api_seller_registration_pending_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // Register a new seller using the utility function
  const seller = await authorize_seller_join(connection, {});
  // Validate the seller response with typia.assert
  typia.assert(seller);
  // Verify approval status is "pending" for newly registered seller
  TestValidator.equals(
    "seller approval status is pending",
    seller.approvalStatus,
    "pending",
  );
  // Verify rejection reason is null (not rejected yet)
  TestValidator.equals(
    "rejection reason is null for pending seller",
    seller.rejectionReason,
    null,
  );
  // Verify rejected at is null (not rejected yet)
  TestValidator.equals(
    "rejected at is null for pending seller",
    seller.rejectedAt,
    null,
  );
}
