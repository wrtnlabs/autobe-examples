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

export async function test_api_variant_snapshot_option_values_history_review_by_administrator(
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
  const baselineRequest = {
    page: 1,
    limit: 10,
    sort: "created_at",
  } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest;
  const baseline =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.option_values.index(
      administratorConnection,
      {
        productId,
        variantId,
        productVariantSnapshotId,
        body: baselineRequest,
      },
    );
  typia.assert(baseline);
  TestValidator.equals(
    "baseline page reflects request",
    baseline.pagination.current,
    baselineRequest.page,
  );
  TestValidator.equals(
    "baseline limit reflects request",
    baseline.pagination.limit,
    baselineRequest.limit,
  );
  TestValidator.predicate(
    "baseline records non-negative",
    baseline.pagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline pages non-negative",
    baseline.pagination.pages >= 0,
  );
  for (let i = 1; i < baseline.data.length; ++i) {
    const previous = baseline.data[i - 1]!;
    const current = baseline.data[i]!;
    TestValidator.predicate(
      "baseline created_at sorted ascending with stable tie handling",
      previous.created_at < current.created_at ||
        (previous.created_at === current.created_at &&
          previous.id <= current.id),
    );
  }
  const sample = baseline.data[0];
  if (sample !== undefined) {
    const nameFilterRequest = {
      page: 1,
      limit: 10,
      name: sample.name,
      sort: "name",
    } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest;
    const byName =
      await api.functional.shoppingMall.administrator.products.variants.snapshots.option_values.index(
        administratorConnection,
        {
          productId,
          variantId,
          productVariantSnapshotId,
          body: nameFilterRequest,
        },
      );
    typia.assert(byName);
    TestValidator.predicate(
      "name filter does not expand result count",
      byName.pagination.records <= baseline.pagination.records,
    );
    for (const row of byName.data) {
      TestValidator.equals(
        "name filter matches row name",
        row.name,
        sample.name,
      );
    }
    for (let i = 1; i < byName.data.length; ++i) {
      const previous = byName.data[i - 1]!;
      const current = byName.data[i]!;
      TestValidator.predicate(
        "name sort ascending with stable tie handling",
        previous.name < current.name ||
          (previous.name === current.name && previous.id <= current.id),
      );
    }
    const valueFilterRequest = {
      page: 1,
      limit: 10,
      value: sample.value,
      sort: "value",
    } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest;
    const byValue =
      await api.functional.shoppingMall.administrator.products.variants.snapshots.option_values.index(
        administratorConnection,
        {
          productId,
          variantId,
          productVariantSnapshotId,
          body: valueFilterRequest,
        },
      );
    typia.assert(byValue);
    TestValidator.predicate(
      "value filter does not expand result count",
      byValue.pagination.records <= baseline.pagination.records,
    );
    for (const row of byValue.data) {
      TestValidator.equals(
        "value filter matches row value",
        row.value,
        sample.value,
      );
    }
    for (let i = 1; i < byValue.data.length; ++i) {
      const previous = byValue.data[i - 1]!;
      const current = byValue.data[i]!;
      TestValidator.predicate(
        "value sort ascending with stable tie handling",
        previous.value < current.value ||
          (previous.value === current.value && previous.id <= current.id),
      );
    }
    const keyword = [sample.name, sample.value].find(
      (value) => value.length > 0,
    );
    if (keyword !== undefined) {
      const searchRequest = {
        page: 1,
        limit: 10,
        search: keyword,
        sort: "-updated_at",
      } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest;
      const searched =
        await api.functional.shoppingMall.administrator.products.variants.snapshots.option_values.index(
          administratorConnection,
          {
            productId,
            variantId,
            productVariantSnapshotId,
            body: searchRequest,
          },
        );
      typia.assert(searched);
      TestValidator.predicate(
        "search does not expand result count",
        searched.pagination.records <= baseline.pagination.records,
      );
      for (const row of searched.data) {
        TestValidator.predicate(
          "search hits historical name or value",
          row.name.includes(keyword) || row.value.includes(keyword),
        );
      }
      for (let i = 1; i < searched.data.length; ++i) {
        const previous = searched.data[i - 1]!;
        const current = searched.data[i]!;
        TestValidator.predicate(
          "updated_at sorted descending with stable tie handling",
          previous.updated_at > current.updated_at ||
            (previous.updated_at === current.updated_at &&
              previous.id <= current.id),
        );
      }
    }
  }
  const descendingNameRequest = {
    page: 1,
    limit: 10,
    sort: "-name",
  } satisfies IShoppingMallProductVariantSnapshotOptionValue.IRequest;
  const descendingName =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.option_values.index(
      administratorConnection,
      {
        productId,
        variantId,
        productVariantSnapshotId,
        body: descendingNameRequest,
      },
    );
  typia.assert(descendingName);
  for (let i = 1; i < descendingName.data.length; ++i) {
    const previous = descendingName.data[i - 1]!;
    const current = descendingName.data[i]!;
    TestValidator.predicate(
      "name sort descending with stable tie handling",
      previous.name > current.name ||
        (previous.name === current.name && previous.id <= current.id),
    );
  }
}
