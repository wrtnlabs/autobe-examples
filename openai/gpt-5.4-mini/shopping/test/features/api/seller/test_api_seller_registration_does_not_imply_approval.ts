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
 * Verify seller registration does not imply approval to sell.
 *
 * Validates that a newly registered seller account is created in the pending
 * approval state rather than being automatically approved. Also checks that the
 * registration response contains the expected authentication bundle and that the
 * seller profile is created and linked to the new account.
 *
 * 1. Register a new seller account through the seller join flow.
 * 2. Confirm the returned account is pending and has no rejection reason.
 * 3. Confirm the seller profile is created for the same account identity.
 * 4. Confirm token issuance occurs without implying approval.
 */
export async function test_api_seller_registration_does_not_imply_approval(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "seller registration should start in pending status",
    authorized.status.status,
    "pending",
  );
  TestValidator.equals(
    "seller registration should not have a rejection reason",
    authorized.status.rejectionReason,
    null,
  );
  TestValidator.equals(
    "seller profile should be linked to the authenticated seller",
    authorized.sellerProfile.sellerAccount.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller profile should reflect the same pending account state",
    authorized.sellerProfile.sellerAccount.status,
    authorized.status.status,
  );
  TestValidator.predicate(
    "token access should be issued on registration",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh should be issued on registration",
    authorized.token.refresh.length > 0,
  );
}
