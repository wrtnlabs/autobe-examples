import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_forbidden_for_unrelated_seller(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const ownerJoin = await authorize_seller_join(ownerConnection, {
    body: ownerJoinBody,
  });
  typia.assert(ownerJoin);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const intruderJoin = await authorize_seller_join(intruderConnection, {
    body: intruderJoinBody,
  });
  typia.assert(intruderJoin);
  TestValidator.notEquals(
    "different sellers must be created",
    ownerJoin.id,
    intruderJoin.id,
  );
  TestValidator.notEquals(
    "different seller emails must be created",
    ownerJoin.email,
    intruderJoin.email,
  );
  const foreignSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unrelated seller cannot read another seller profile snapshot",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.seller.profile.snapshots.at(
        intruderConnection,
        {
          snapshotId: foreignSnapshotId,
        },
      );
    },
  );
}
