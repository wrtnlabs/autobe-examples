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

/**
 * Test approved seller account profile visibility after authentication.
 *
 * Creates a fresh seller account, logs in with the same credentials, and verifies that the seller account endpoint returns the authenticated seller's approved account record together with the linked seller profile data.
 *
 * This scenario also checks the account-state edge cases that matter for an approved seller: the approval status must remain approved, rejection details must stay empty, and the profile relation must point back to the same seller account identity.
 *
 * 1. Register a new seller account.
 * 2. Authenticate the same seller through a separate seller connection.
 * 3. Read the seller account record from the authenticated seller session.
 * 4. Validate the returned account and linked seller profile relationship data.
 */
export async function test_api_seller_account_approved_profile_view(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(joinConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.ILogin,
  });
  typia.assert(loggedIn);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${loggedIn.token.access}`,
  };
  const account =
    await api.functional.mallPlatform.seller.sellerAccount.at(sellerConnection);
  typia.assert(account);
  TestValidator.equals(
    "seller account id should match authenticated seller",
    account.id,
    loggedIn.id,
  );
  TestValidator.equals(
    "seller account email should match login email",
    account.email,
    email,
  );
  TestValidator.equals(
    "seller account should be approved after approval flow",
    account.approval_status,
    "approved",
  );
  TestValidator.equals(
    "approved seller should not expose rejection reason",
    account.rejection_reason,
    null,
  );
  TestValidator.equals(
    "seller profile owner should match account id",
    account.sellerProfile.sellerAccount.id,
    account.id,
  );
  TestValidator.equals(
    "seller profile owner email should match account email",
    account.sellerProfile.sellerAccount.email,
    account.email,
  );
  TestValidator.equals(
    "seller profile approval status should match account approval status",
    account.sellerProfile.sellerAccount.approvalStatus,
    account.approval_status,
  );
  TestValidator.equals(
    "seller profile rejection reason should match account rejection reason",
    account.sellerProfile.sellerAccount.rejectionReason,
    account.rejection_reason,
  );
  TestValidator.equals(
    "seller profile deleted state should be empty",
    account.sellerProfile.deletedAt,
    null,
  );
}
