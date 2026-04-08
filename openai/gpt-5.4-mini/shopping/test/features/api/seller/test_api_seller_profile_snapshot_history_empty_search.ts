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

export async function test_api_seller_profile_snapshot_history_empty_search(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` as string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const output =
    await api.functional.mallPlatform.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          search: RandomGenerator.alphaNumeric(32),
          page: 1,
          limit: 10,
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "empty search returns page 1",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search preserves requested limit",
    output.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty search has zero records",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has zero pages",
    output.pagination.pages,
    0,
  );
  TestValidator.equals("empty search returns no data", output.data.length, 0);
}
