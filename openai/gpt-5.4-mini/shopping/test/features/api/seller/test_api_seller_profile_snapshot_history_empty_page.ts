import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies empty seller profile snapshot history for a newly registered seller.
 *
 * Confirms that the immutable seller profile snapshot history endpoint returns a valid paginated
 * page with no records when the seller has never edited their storefront profile.
 *
 * This test covers the first-time seller edge case and ensures the endpoint is safe to call even
 * before any profile snapshots exist, while still returning pagination metadata for client-side
 * browsing.
 *
 * 1. Register a new seller account through the seller join utility.
 * 2. Request the seller profile snapshot history using the authenticated seller connection.
 * 3. Validate that the response contains pagination metadata and an empty data array.
 */
export async function test_api_seller_profile_snapshot_history_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password: "Password123!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const output =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.history.at(
      sellerConnection,
    );
  typia.assert(output);
  TestValidator.equals("history data should be empty", output.data, []);
  TestValidator.equals(
    "history records should be zero",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "history pages should be zero",
    output.pagination.pages,
    0,
  );
  TestValidator.equals(
    "history current page should be one",
    output.pagination.current,
    1,
  );
}
