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

export async function test_api_variant_snapshot_option_values_hierarchy_mismatch_not_found(
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
  const requestBody = {
    search: RandomGenerator.paragraph({ sentences: 2 }),
    name: RandomGenerator.name(1),
    value: RandomGenerator.name(1),
    sort: RandomGenerator.pick([
      "created_at",
      "-created_at",
      "updated_at",
      "-updated_at",
      "name",
      "-name",
      "value",
      "-value",
    ] as const),
    page: 1,
    limit: 10,
  } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest;
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const productVariantSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "rejects unrelated product, variant, and snapshot hierarchy as not found",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.products.variants.snapshots.option_values.index(
        administratorConnection,
        {
          productId,
          variantId,
          productVariantSnapshotId,
          body: requestBody,
        },
      );
    },
  );
}
