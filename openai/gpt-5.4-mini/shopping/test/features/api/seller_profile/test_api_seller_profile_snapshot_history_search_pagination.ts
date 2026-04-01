import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_snapshot_history_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  const search = RandomGenerator.alphabets(8);
  const page = 2 as const;
  const limit = 3 as const;
  const response =
    await api.functional.mallPlatform.administrator.seller_profiles.snapshots.index(
      adminConnection,
      {
        sellerProfileId,
        body: {
          search,
          page,
          limit,
        } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size does not exceed limit",
    response.data.length <= limit,
  );
  TestValidator.predicate(
    "all snapshots match the search keyword",
    response.data.every(
      (snapshot) =>
        snapshot.shopName.includes(search) ||
        snapshot.shopDescription.includes(search),
    ),
  );
  TestValidator.predicate(
    "snapshots are sorted by createdAt descending",
    response.data.every(
      (snapshot, index, array) =>
        index === 0 ||
        new Date(array[index - 1].createdAt).getTime() >=
          new Date(snapshot.createdAt).getTime(),
    ),
  );
  TestValidator.equals(
    "total pages matches records and limit",
    response.pagination.pages,
    response.pagination.limit > 0
      ? Math.ceil(response.pagination.records / response.pagination.limit)
      : 0,
  );
}
