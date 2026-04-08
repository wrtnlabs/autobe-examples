import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_rejected_detail_includes_reason(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator seller detail lookup for rejected accounts includes rejection reason.
   *
   * Verifies that the administrator can retrieve a seller detail response and
   * inspect the moderation state, rejection reason, and live storefront identity
   * fields returned by the marketplace governance endpoint.
   *
   * 1. Register and authenticate an administrator account using a dedicated connection.
   * 2. Retrieve a seller detail record through the administrative seller endpoint.
   * 3. Validate that the returned seller payload exposes the moderation state, rejection reason, and storefront profile.
   * 4. Confirm the seller profile remains linked to the seller account returned by the detail endpoint.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const seller = await api.functional.mallPlatform.administrator.sellers.at(
    adminConnection,
    {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(seller);
  TestValidator.predicate(
    "seller account status should be a moderation state",
    seller.status.status === "pending" ||
      seller.status.status === "approved" ||
      seller.status.status === "rejected",
  );
  TestValidator.equals(
    "seller rejection reason should match nested status reason",
    seller.rejectionReason,
    seller.status.rejectionReason,
  );
  TestValidator.predicate(
    "seller storefront identity should be present",
    seller.sellerProfile.shopName.length > 0 &&
      seller.sellerProfile.shopDescription.length >= 0,
  );
  TestValidator.equals(
    "seller profile should reference the same seller id",
    seller.sellerProfile.sellerAccount.id,
    seller.id,
  );
  TestValidator.equals(
    "seller profile email should match seller account email",
    seller.sellerProfile.sellerAccount.email,
    seller.email,
  );
}
