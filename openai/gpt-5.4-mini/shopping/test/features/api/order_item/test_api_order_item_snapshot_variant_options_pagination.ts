import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_snapshot_variant_options_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    orderItemId,
    snapshotId,
    body: {
      page: 1,
      limit: 2,
      sort: "+createdAt",
    } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
  };
  const firstPage =
    await api.functional.mallPlatform.administrator.order_items.snapshots.variant_options.index(
      adminConnection,
      request,
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.predicate(
    "first page data should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "first page pages should be consistent with records and limit",
    firstPage.pagination.limit > 0
      ? firstPage.pagination.pages ===
          Math.ceil(firstPage.pagination.records / firstPage.pagination.limit)
      : firstPage.pagination.pages === 0,
  );
  TestValidator.predicate(
    "first page data should be within pagination bounds",
    firstPage.data.length <= firstPage.pagination.records,
  );
  for (const row of firstPage.data)
    typia.assert<IMallPlatformOrderItemSnapshotVariantOption.ISummary>(row);
  const secondPage =
    await api.functional.mallPlatform.administrator.order_items.snapshots.variant_options.index(
      adminConnection,
      {
        orderItemId,
        snapshotId,
        body: {
          page: 2,
          limit: 2,
          sort: "+createdAt",
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  TestValidator.predicate(
    "second page pages should be consistent with records and limit",
    secondPage.pagination.limit > 0
      ? secondPage.pagination.pages ===
          Math.ceil(secondPage.pagination.records / secondPage.pagination.limit)
      : secondPage.pagination.pages === 0,
  );
  for (const row of secondPage.data)
    typia.assert<IMallPlatformOrderItemSnapshotVariantOption.ISummary>(row);
  const repeatedFirstPage =
    await api.functional.mallPlatform.administrator.order_items.snapshots.variant_options.index(
      adminConnection,
      {
        orderItemId,
        snapshotId,
        body: {
          page: 1,
          limit: 2,
          sort: "+createdAt",
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(repeatedFirstPage);
  TestValidator.equals(
    "repeated first page ids should match",
    firstPage.data.map((row) => row.id),
    repeatedFirstPage.data.map((row) => row.id),
  );
  if (firstPage.data.length > 0) {
    const sample = firstPage.data[0];
    const filteredByName =
      await api.functional.mallPlatform.administrator.order_items.snapshots.variant_options.index(
        adminConnection,
        {
          orderItemId,
          snapshotId,
          body: {
            search: sample.optionName,
            page: 1,
            limit: 10,
            sort: "+createdAt",
          } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
        },
      );
    typia.assert(filteredByName);
    for (const row of filteredByName.data)
      typia.assert<IMallPlatformOrderItemSnapshotVariantOption.ISummary>(row);
    TestValidator.predicate(
      "search by option name should keep snapshot scope",
      filteredByName.data.every(
        (row) =>
          row.optionName
            .toLowerCase()
            .includes(sample.optionName.toLowerCase()) ||
          row.optionValue
            .toLowerCase()
            .includes(sample.optionName.toLowerCase()),
      ),
    );
    const filteredByValue =
      await api.functional.mallPlatform.administrator.order_items.snapshots.variant_options.index(
        adminConnection,
        {
          orderItemId,
          snapshotId,
          body: {
            search: sample.optionValue,
            page: 1,
            limit: 10,
            sort: "+createdAt",
          } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
        },
      );
    typia.assert(filteredByValue);
    for (const row of filteredByValue.data)
      typia.assert<IMallPlatformOrderItemSnapshotVariantOption.ISummary>(row);
    TestValidator.predicate(
      "search by option value should keep snapshot scope",
      filteredByValue.data.every(
        (row) =>
          row.optionName
            .toLowerCase()
            .includes(sample.optionValue.toLowerCase()) ||
          row.optionValue
            .toLowerCase()
            .includes(sample.optionValue.toLowerCase()),
      ),
    );
  }
}
