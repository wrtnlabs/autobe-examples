import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImageCopy";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_image_copies_deleted_product_history_access(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(administrator);
  TestValidator.equals(
    "administrator session email matches authorization payload",
    administratorConnection.headers?.Authorization,
    administrator.token.access,
  );
  TestValidator.predicate(
    "administrator account is not banned after join",
    administrator.banned === false,
  );
  const request = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "sequence",
    direction: "asc",
  } satisfies IShoppingMallProductSnapshotImageCopy.IRequest;
  const page =
    await api.functional.shoppingMall.administrator.products.snapshots.image_copies.index(
      administratorConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        productSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data length does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  for (let i = 0; i < page.data.length; ++i) {
    const current = page.data[i];
    TestValidator.equals(
      `historical sequence is stable at index ${i}`,
      current.sequence,
      Math.trunc(current.sequence),
    );
    if (i !== 0) {
      const previous = page.data[i - 1];
      TestValidator.predicate(
        `historical gallery remains ordered by sequence at index ${i}`,
        previous.sequence <= current.sequence,
      );
    }
  }
  const thumbnailCount = page.data.filter((elem) => elem.thumbnail).length;
  TestValidator.predicate(
    "historical gallery has at most one thumbnail designation in returned page",
    thumbnailCount <= 1,
  );
}
