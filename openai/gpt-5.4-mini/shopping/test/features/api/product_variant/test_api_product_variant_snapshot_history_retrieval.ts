import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const response =
    await api.functional.shoppingMall.administrator.productVariants.snapshots.index(
      administratorConnection,
      {
        productVariantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination metadata exists",
    () =>
      response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.equals("page number", response.pagination.current, 1);
  TestValidator.equals("page limit", response.pagination.limit, 10);
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  for (let index = 1; index < response.data.length; index++) {
    TestValidator.predicate(
      "snapshots are sorted newest first",
      () =>
        response.data[index - 1].createdAt >= response.data[index].createdAt,
    );
  }
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    TestValidator.predicate("snapshot id exists", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot variant summary exists",
      () =>
        snapshot.productVariant.id.length > 0 &&
        snapshot.productVariant.skuCode.length > 0 &&
        snapshot.productVariant.createdAt.length > 0 &&
        snapshot.productVariant.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot preserved variant fields exist",
      () =>
        snapshot.skuCode.length > 0 &&
        snapshot.optionValues.length > 0 &&
        snapshot.createdAt.length > 0 &&
        Number.isFinite(snapshot.price) &&
        Number.isFinite(snapshot.stockQuantity),
    );
  }
}
