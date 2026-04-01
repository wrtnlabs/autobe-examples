import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_images_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const request: IMallPlatformProductSnapshotImage.IRequest = {
    page: 1,
    limit: 2,
    sort: "asc",
  };
  const first =
    await api.functional.mallPlatform.administrator.products.snapshots.images.index(
      administratorConnection,
      {
        productId,
        snapshotId,
        body: request,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.administrator.products.snapshots.images.index(
      administratorConnection,
      {
        productId,
        snapshotId,
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals("stable repeated response", second, first);
  TestValidator.equals("pagination current", first.pagination.current, 1);
  TestValidator.equals("pagination limit", first.pagination.limit, 2);
  TestValidator.equals(
    "pagination pages computed from records and limit",
    first.pagination.pages,
    first.pagination.limit > 0
      ? Math.ceil(first.pagination.records / first.pagination.limit)
      : 0,
  );
  TestValidator.equals(
    "data length within page limit",
    first.data.length,
    first.data.length <= first.pagination.limit
      ? first.data.length
      : first.pagination.limit,
  );
  TestValidator.predicate("ascending sort order", () =>
    first.data.every(
      (item, index, array) =>
        index === 0 || array[index - 1].sortOrder <= item.sortOrder,
    ),
  );
  const desc =
    await api.functional.mallPlatform.administrator.products.snapshots.images.index(
      administratorConnection,
      {
        productId,
        snapshotId,
        body: {
          ...request,
          sort: "desc",
        } satisfies IMallPlatformProductSnapshotImage.IRequest,
      },
    );
  typia.assert(desc);
  TestValidator.predicate("descending sort order", () =>
    desc.data.every(
      (item, index, array) =>
        index === 0 || array[index - 1].sortOrder >= item.sortOrder,
    ),
  );
  TestValidator.equals(
    "same immutable image set across sort directions",
    first.data
      .map((item) => item.imageUri)
      .slice()
      .sort(),
    desc.data
      .map((item) => item.imageUri)
      .slice()
      .sort(),
  );
}
