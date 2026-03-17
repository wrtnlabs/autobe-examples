import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
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

export async function test_api_variant_snapshot_history_deleted_variant_review(
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
        href: `https://admin.example.com/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://admin.example.com/${RandomGenerator.alphaNumeric(8)}/referrer`,
      },
    },
  );
  typia.assert(administrator);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    created_at_from: new Date(0).toISOString(),
    created_at_to: new Date().toISOString(),
    sort: "-created_at",
  } satisfies IShoppingMallProductVariantSnapshot.IRequest;
  const page =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.index(
      administratorConnection,
      {
        productId,
        variantId,
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    page.pagination.limit === 0 || page.data.length <= page.pagination.limit,
  );
  page.data.forEach((snapshot) => {
    TestValidator.predicate(
      "snapshot preserved sku code is not empty",
      snapshot.skuCode.length > 0,
    );
    TestValidator.predicate(
      "snapshot change summary is not empty",
      snapshot.changeSummary.length > 0,
    );
    TestValidator.predicate(
      "snapshot historical price is nullable or non-negative",
      snapshot.price === null || snapshot.price >= 0,
    );
    TestValidator.predicate(
      "snapshot option values are reviewable when present",
      snapshot.optionValues.every(
        (option) => option.name.length > 0 && option.value.length > 0,
      ),
    );
    TestValidator.predicate(
      "snapshot current variant summary remains populated",
      snapshot.productVariant.sku_code.length > 0 &&
        snapshot.productVariant.option_summary.length > 0,
    );
    TestValidator.predicate(
      "snapshot product snapshot linkage is reviewable when present",
      snapshot.productSnapshot === null ||
        (snapshot.productSnapshot.product.id.length > 0 &&
          snapshot.productSnapshot.product.name.length > 0 &&
          snapshot.productSnapshot.variant_snapshot_count >= 0 &&
          snapshot.productSnapshot.image_copy_count >= 0),
    );
  });
  if (page.data.length > 0) {
    const first = page.data[0];
    TestValidator.predicate(
      "historical review preserves reconstructable variant fields",
      first.skuCode.length > 0 &&
        first.changeSummary.length > 0 &&
        (first.optionValues.length > 0 || first.price !== null),
    );
  }
}
