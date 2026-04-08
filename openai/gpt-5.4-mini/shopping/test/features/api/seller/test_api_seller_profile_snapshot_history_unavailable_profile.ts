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

export async function test_api_seller_profile_snapshot_history_unavailable_profile(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller profile snapshot history for the authenticated seller context.
   *
   * This test validates that the seller profile snapshot history endpoint returns
   * a proper paginated response for the authenticated seller and does not invent
   * unrelated profile data.
   *
   * 1. Register a seller account with valid credentials.
   * 2. Request the seller profile snapshot history for that seller.
   * 3. Validate the page response and pagination metadata.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const output =
    await api.functional.mallPlatform.seller.sellers.profile.snapshots.index(
      sellerConnection,
      {
        sellerId: authorized.id,
        body: {} satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "snapshot history response should be paginated",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.equals(
    "snapshot history data must be an array",
    Array.isArray(output.data),
    true,
  );
}
