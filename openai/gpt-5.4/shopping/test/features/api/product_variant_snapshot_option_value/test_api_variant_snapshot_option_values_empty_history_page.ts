import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshotOptionValue";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_variant_snapshot_option_values_empty_history_page(
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
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const productVariantSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    limit: 10,
    sort: "created_at",
  } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest;
  const page =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.option_values.index(
      administratorConnection,
      {
        productId,
        variantId,
        productVariantSnapshotId,
        body,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "pagination current matches request",
    page.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "records are non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate("pages are non-negative", page.pagination.pages >= 0);
  TestValidator.predicate(
    "data length does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  if (page.data.length === 0) {
    TestValidator.equals(
      "empty result has zero records",
      page.pagination.records,
      0,
    );
    TestValidator.predicate(
      "empty result has coherent pages",
      page.pagination.pages === 0 || page.pagination.current >= 1,
    );
  }
}
