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

export async function test_api_variant_snapshot_option_value_history_availability_rules(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const fixtureSource:
    | {
        productId?: string;
        variantId?: string;
        productVariantSnapshotId?: string;
        optionValueId?: string;
      }
    | undefined = (
    globalThis as {
      __E2E_SHOPPING_MALL_VARIANT_SNAPSHOT_OPTION_VALUE_FIXTURE?: {
        productId?: string;
        variantId?: string;
        productVariantSnapshotId?: string;
        optionValueId?: string;
      };
    }
  ).__E2E_SHOPPING_MALL_VARIANT_SNAPSHOT_OPTION_VALUE_FIXTURE;
  TestValidator.predicate(
    "variant snapshot option value fixture exists",
    fixtureSource !== undefined,
  );
  const fixture = fixtureSource as {
    productId?: string;
    variantId?: string;
    productVariantSnapshotId?: string;
    optionValueId?: string;
  };
  const productId = typia.assert<string & tags.Format<"uuid">>(
    fixture.productId,
  );
  const variantId = typia.assert<string & tags.Format<"uuid">>(
    fixture.variantId,
  );
  const productVariantSnapshotId = typia.assert<string & tags.Format<"uuid">>(
    fixture.productVariantSnapshotId,
  );
  const optionValueId = typia.assert<string & tags.Format<"uuid">>(
    fixture.optionValueId,
  );
  const optionValue =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.option_values.at(
      adminConnection,
      {
        productId,
        variantId,
        productVariantSnapshotId,
        optionValueId,
      },
    );
  typia.assert<IShoppingMallProductVariantSnapshotOptionValue>(optionValue);
  TestValidator.equals(
    "option value id matches requested history record",
    optionValue.id,
    optionValueId,
  );
  TestValidator.equals(
    "snapshot id matches requested snapshot",
    optionValue.productVariantSnapshot.id,
    productVariantSnapshotId,
  );
  TestValidator.equals(
    "variant id matches requested variant lineage",
    optionValue.productVariantSnapshot.productVariant.id,
    variantId,
  );
  TestValidator.predicate(
    "preserved option name is populated",
    optionValue.name.length > 0,
  );
  TestValidator.predicate(
    "preserved option value is populated",
    optionValue.value.length > 0,
  );
  const preservedSummary = optionValue.productVariantSnapshot.optionValues.find(
    (elem) => elem.id === optionValueId,
  );
  TestValidator.predicate(
    "requested option value is present in snapshot summary collection",
    preservedSummary !== undefined,
  );
  TestValidator.equals(
    "history resource exposes the requested preserved option name",
    optionValue.name,
    preservedSummary?.name,
  );
  TestValidator.equals(
    "history resource exposes the requested preserved option value",
    optionValue.value,
    preservedSummary?.value,
  );
  if (optionValue.productVariantSnapshot.productSnapshot !== null) {
    TestValidator.equals(
      "product id remains reachable through snapshot hierarchy",
      optionValue.productVariantSnapshot.productSnapshot.product.id,
      productId,
    );
  } else {
    TestValidator.equals(
      "history remains accessible as the requested snapshot resource",
      optionValue.productVariantSnapshot.id,
      productVariantSnapshotId,
    );
  }
}
