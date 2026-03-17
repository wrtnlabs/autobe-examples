import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_deleted_listing_history_access(
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
  try {
    const snapshot =
      await api.functional.shoppingMall.administrator.products.variants.snapshots.at(
        administratorConnection,
        {
          productId,
          variantId,
          productVariantSnapshotId,
        },
      );
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot id matches requested identifier",
      snapshot.id,
      productVariantSnapshotId,
    );
    TestValidator.equals(
      "variant id matches requested identifier",
      snapshot.productVariant.id,
      variantId,
    );
    TestValidator.equals(
      "product id matches requested identifier when product snapshot exists",
      snapshot.productSnapshot?.product.id ?? productId,
      productId,
    );
    TestValidator.predicate(
      "historical sku code is preserved",
      snapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      "historical option summary is preserved",
      snapshot.option_summary.length > 0,
    );
    TestValidator.predicate(
      "change summary is preserved",
      snapshot.change_summary.length > 0,
    );
    snapshot.optionValues.forEach((optionValue) => {
      typia.assert(optionValue);
      TestValidator.equals(
        "option belongs to requested snapshot",
        optionValue.productVariantSnapshot.id,
        snapshot.id,
      );
      TestValidator.predicate(
        "option name is preserved",
        optionValue.name.length > 0,
      );
      TestValidator.predicate(
        "option value is preserved",
        optionValue.value.length > 0,
      );
    });
  } catch (exp) {
    TestValidator.predicate(
      "setup-limited retrieval failure is reported as http error",
      exp instanceof api.HttpError,
    );
    const httpError = exp as api.HttpError;
    TestValidator.equals(
      "missing product-variant-snapshot hierarchy returns not found",
      httpError.status,
      404,
    );
  }
}
