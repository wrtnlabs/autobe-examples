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

export async function test_api_seller_profile_snapshot_history_newest_first_ordering(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify seller profile snapshot history is ordered newest first.
   *
   * This test authenticates a seller account and reads the seller profile snapshot history endpoint to confirm that immutable snapshot records are returned in descending creation order.
   *
   * 1. Authenticate a seller using the seller join flow.
   * 2. Retrieve seller profile snapshot history.
   * 3. Validate pagination metadata and confirm the returned records are ordered from newest to oldest by createdAt.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const history =
    await api.functional.mallPlatform.seller.sellerProfileSnapshots.history.at(
      sellerConnection,
    );
  typia.assert(history);
  TestValidator.equals(
    "history data length matches returned slice",
    history.data.length,
    Math.min(history.pagination.limit, history.pagination.records),
  );
  TestValidator.predicate(
    "history pagination current page is first page",
    history.pagination.current === 1,
  );
  TestValidator.predicate(
    "history pagination record count is non-negative",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "history pagination page count is non-negative",
    history.pagination.pages >= 0,
  );
  if (history.data.length > 1) {
    for (let index = 1; index < history.data.length; ++index) {
      TestValidator.predicate(
        "seller profile snapshots are ordered newest first",
        history.data[index - 1].createdAt >= history.data[index].createdAt,
      );
    }
  }
}
