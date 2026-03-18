import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_snapshot_retrieve_as_administrator(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const snapshot =
    await api.functional.shoppingMall.seller.productVariants.snapshots.at(
      administratorConnection,
      {
        productVariantId: administrator.id as string & tags.Format<"uuid">,
        snapshotId: administrator.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot id preserved", snapshot.id, snapshot.id);
  TestValidator.predicate(
    "snapshot contains historical variant summary",
    snapshot.productVariant.id.length > 0 &&
      snapshot.productVariant.skuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot sku code preserved",
    snapshot.sku_code.length > 0,
  );
  TestValidator.predicate(
    "snapshot option values preserved",
    snapshot.option_values.length >= 0,
  );
  TestValidator.predicate(
    "snapshot price is non-negative",
    snapshot.price >= 0,
  );
  TestValidator.predicate(
    "snapshot stock quantity is integer",
    Number.isInteger(snapshot.stock_quantity),
  );
  TestValidator.predicate(
    "snapshot created_at present",
    snapshot.created_at.length > 0,
  );
}
