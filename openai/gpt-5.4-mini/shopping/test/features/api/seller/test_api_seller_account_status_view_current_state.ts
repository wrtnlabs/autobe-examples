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

export async function test_api_seller_account_status_view_current_state(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller account status retrieval for the currently authenticated seller.
   *
   * Verifies that a signed-in seller can query their own approval state and
   * receive only account-status information for the authenticated identity.
   * The response is validated as the seller account read model, and the test
   * confirms the normal business states remain within the expected live path.
   *
   * 1. Register a fresh seller account to obtain an authenticated seller session.
   * 2. Query the current seller account status using the seller-specific connection.
   * 3. Validate the returned account state and confirm it belongs to the same seller.
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
    await api.functional.mallPlatform.seller.account.status.at(
      sellerConnection,
    );
  typia.assert(account);
  TestValidator.equals(
    "seller account email should match the authenticated seller",
    account.email,
    joined.email,
  );
  TestValidator.predicate(
    "seller account approval status should be a normal live state",
    () => ["pending", "approved"].includes(account.approval_status),
  );
  TestValidator.equals(
    "seller account id should match the authenticated seller",
    account.id,
    joined.id,
  );
  TestValidator.equals(
    "seller profile owner should match the authenticated seller",
    account.sellerProfile.sellerAccount.id,
    joined.id,
  );
  TestValidator.equals(
    "seller rejection reason should be null for non-rejected accounts",
    account.rejection_reason,
    null,
  );
}
