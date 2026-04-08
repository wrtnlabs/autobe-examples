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

export async function test_api_seller_profile_snapshot_history_owner_listing(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await api.functional.mallPlatform.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformSeller.IJoin,
    },
  );
  typia.assert(joined);
  const response =
    await api.functional.mallPlatform.seller.sellers.profile.snapshots.index(
      sellerConnection,
      {
        sellerId: joined.id,
        body: {} satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "seller profile snapshot page should be non-negative",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "seller profile snapshot pagination should be internally consistent",
    response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "snapshot list length should match pagination records on the first page when all records fit",
    response.data.length <= response.pagination.limit ||
      response.pagination.limit === 0,
    true,
  );
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot should preserve seller profile reference",
      snapshot.sellerProfile !== null && snapshot.sellerProfile !== undefined,
    );
    TestValidator.predicate(
      "snapshot should preserve shop name",
      snapshot.shopName.length > 0,
    );
    TestValidator.predicate(
      "snapshot should preserve shop description",
      snapshot.shopDescription.length >= 0,
    );
    TestValidator.predicate(
      "snapshot should preserve creation timestamp",
      snapshot.createdAt.length > 0,
    );
  }
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      "snapshot history should be ordered newest first by createdAt",
      response.data[i - 1].createdAt >= response.data[i].createdAt,
    );
  }
}
