import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_account_pending_status_view(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify a newly registered seller can view the pending approval status on their own account record.
   *
   * This scenario validates the seller-facing account status page for a freshly onboarded merchant.
   * It ensures the authenticated seller receives only their own account information, that the approval
   * state is pending before moderation, that rejection details remain null, and that storefront-facing
   * profile information is included for display.
   *
   * 1. Register a new seller in an isolated seller connection.
   * 2. Fetch the current seller account using the authenticated seller session.
   * 3. Validate the account identity, approval status, rejection reason, and linked seller profile.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  const account =
    await api.functional.mallPlatform.seller.sellerAccount.at(sellerConnection);
  typia.assert(account);
  TestValidator.equals("seller account id", account.id, joined.id);
  TestValidator.equals("seller account email", account.email, joined.email);
  TestValidator.equals(
    "approval status is pending",
    account.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection reason is null",
    account.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "seller profile exists",
    account.sellerProfile !== null,
  );
  const sellerProfile = account.sellerProfile;
  if (sellerProfile === null) return;
  TestValidator.equals(
    "seller profile owner account id",
    sellerProfile.sellerAccount.id,
    account.id,
  );
  TestValidator.equals(
    "seller profile owner approval status",
    sellerProfile.sellerAccount.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "seller profile owner rejection reason",
    sellerProfile.sellerAccount.rejectionReason,
    null,
  );
  TestValidator.equals(
    "seller profile linked to authenticated seller email",
    sellerProfile.sellerAccount.email,
    account.email,
  );
}
