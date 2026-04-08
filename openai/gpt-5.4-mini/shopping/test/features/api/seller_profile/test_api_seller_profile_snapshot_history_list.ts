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

export async function test_api_seller_profile_snapshot_history_list(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const snapshotConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: seller.token.access,
    },
  };
  const response =
    await api.functional.mallPlatform.seller.profile.snapshots.index(
      snapshotConnection,
      {
        body: {} satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("default page number", response.pagination.current, 1);
  TestValidator.equals(
    "default sort direction limit",
    response.pagination.limit,
    response.data.length,
  );
  TestValidator.predicate(
    "pagination values are non-negative",
    response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot items are ordered newest first",
    response.data.every(
      (item, index, array) =>
        index === 0 ||
        new Date(array[index - 1]!.createdAt).getTime() >=
          new Date(item.createdAt).getTime(),
    ),
  );
  TestValidator.predicate(
    "snapshot entries preserve immutable storefront identity fields",
    response.data.every(
      (item) =>
        item.id.length > 0 &&
        item.sellerProfile !== null &&
        item.shopName.length > 0 &&
        item.shopDescription.length >= 0 &&
        (item.logoImageUri === null || item.logoImageUri.length > 0) &&
        item.createdAt.length > 0,
    ),
  );
}
