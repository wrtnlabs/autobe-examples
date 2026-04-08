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

export async function test_api_seller_account_status_show_rejection_reason(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify seller account status visibility for the authenticated seller.
   *
   * This test creates a fresh seller session and then calls the seller account
   * status endpoint through an isolated seller-specific connection. It validates
   * that the endpoint returns the authenticated seller's own account state and
   * exposes the moderation-facing fields required by the approval workflow,
   * including the rejection reason field when the account is rejected.
   *
   * 1. Register a seller account through the seller join utility.
   * 2. Query the seller account status endpoint using the seller-only connection.
   * 3. Validate the returned DTO fields that are defined for seller account
   *    status responses.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const status =
    await api.functional.mallPlatform.seller.account.status.at(
      sellerConnection,
    );
  typia.assert(status);
  TestValidator.equals(
    "seller account state should belong to the authenticated seller",
    status.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller login email should belong to the authenticated seller",
    status.email,
    authorized.email,
  );
  TestValidator.equals(
    "seller profile should be scoped to the authenticated seller",
    status.sellerProfile?.id ?? null,
    authorized.sellerProfile?.id ?? null,
  );
  TestValidator.equals(
    "seller profile shop name should be scoped to the authenticated seller",
    status.sellerProfile?.shopName ?? null,
    authorized.sellerProfile?.shopName ?? null,
  );
  TestValidator.equals(
    "seller profile description should be scoped to the authenticated seller",
    status.sellerProfile?.shopDescription ?? null,
    authorized.sellerProfile?.shopDescription ?? null,
  );
  TestValidator.equals(
    "seller rejection reason field should be present on the status contract",
    status.rejection_reason,
    authorized.rejectionReason,
  );
}
