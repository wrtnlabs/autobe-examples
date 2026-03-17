import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImageCopy";
import type { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_image_copies_ownership_or_snapshot_scope_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const requesterConnection: api.IConnection = { host: connection.host };
  const requester = await authorize_seller_join(requesterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(requester);
  TestValidator.notEquals(
    "different sellers are isolated",
    owner.id,
    requester.id,
  );
  const forbiddenRequest = {
    page: 1,
    limit: 10,
    sort: "sequence",
    direction: "asc",
  } satisfies IShoppingMallProductSnapshotImageCopy.IRequest;
  await TestValidator.error(
    "rejects snapshot image copy lookup for resources outside requester ownership scope",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.image_copies.index(
        requesterConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
          body: forbiddenRequest,
        },
      );
    },
  );
  await TestValidator.error(
    "rejects snapshot image copy lookup when snapshot does not belong to product",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.image_copies.index(
        requesterConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 2,
            limit: 5,
            sort: "created_at",
            direction: "desc",
          } satisfies IShoppingMallProductSnapshotImageCopy.IRequest,
        },
      );
    },
  );
}
