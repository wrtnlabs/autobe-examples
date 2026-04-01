import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_inventory_record_variant_history_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const assertScoped = (
    records: IMallPlatformInventoryRecord.ISummary[],
  ): void => {
    TestValidator.equals(
      "inventory records should remain scoped to the requested product variant",
      records.every((record) => record.productVariant.id === productVariantId),
      true,
    );
  };
  const assertPagination = (
    pagination: IPage.IPagination,
    request: IMallPlatformInventoryRecord.IRequest,
  ): void => {
    TestValidator.equals(
      "pagination current should match request page",
      pagination.current,
      request.page ?? 1,
    );
    TestValidator.equals(
      "pagination limit should match request limit",
      pagination.limit,
      request.limit ?? 10,
    );
    TestValidator.predicate(
      "pagination record count should be non-negative",
      pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination page count should be non-negative",
      pagination.pages >= 0,
    );
  };
  const baseRequest = {
    page: 1,
    limit: 10,
    sort: "newest",
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const newest =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      administratorConnection,
      {
        productVariantId,
        body: baseRequest,
      },
    );
  typia.assert(newest);
  assertScoped(newest.data);
  assertPagination(newest.pagination, baseRequest);
  if (newest.data.length > 1) {
    TestValidator.predicate(
      "newest sort should order inventory records by createdAt descending",
      newest.data.every(
        (record, index, array) =>
          index === 0 || array[index - 1].createdAt >= record.createdAt,
      ),
    );
  }
  const positiveOnly = {
    page: 1,
    limit: 10,
    sort: "newest",
    quantityDirection: "positive",
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const positiveResponse =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      administratorConnection,
      {
        productVariantId,
        body: positiveOnly,
      },
    );
  typia.assert(positiveResponse);
  assertScoped(positiveResponse.data);
  assertPagination(positiveResponse.pagination, positiveOnly);
  TestValidator.equals(
    "positive filter should return only positive inventory movements",
    positiveResponse.data.every((record) => record.quantityChange > 0),
    true,
  );
  const negativeOnly = {
    page: 1,
    limit: 10,
    sort: "newest",
    quantityDirection: "negative",
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const negativeResponse =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      administratorConnection,
      {
        productVariantId,
        body: negativeOnly,
      },
    );
  typia.assert(negativeResponse);
  assertScoped(negativeResponse.data);
  assertPagination(negativeResponse.pagination, negativeOnly);
  TestValidator.equals(
    "negative filter should return only negative inventory movements",
    negativeResponse.data.every((record) => record.quantityChange < 0),
    true,
  );
  const allDirections = {
    page: 1,
    limit: 10,
    sort: "newest",
    quantityDirection: "all",
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const allDirectionsResponse =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      administratorConnection,
      {
        productVariantId,
        body: allDirections,
      },
    );
  typia.assert(allDirectionsResponse);
  assertScoped(allDirectionsResponse.data);
  assertPagination(allDirectionsResponse.pagination, allDirections);
  const keyword = RandomGenerator.alphabets(4);
  const reasonOnly = {
    page: 1,
    limit: 10,
    sort: "newest",
    reason: keyword,
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const reasonResponse =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      administratorConnection,
      {
        productVariantId,
        body: reasonOnly,
      },
    );
  typia.assert(reasonResponse);
  assertScoped(reasonResponse.data);
  assertPagination(reasonResponse.pagination, reasonOnly);
  const searchOnly = {
    page: 1,
    limit: 10,
    sort: "newest",
    search: keyword,
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const searchResponse =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      administratorConnection,
      {
        productVariantId,
        body: searchOnly,
      },
    );
  typia.assert(searchResponse);
  assertScoped(searchResponse.data);
  assertPagination(searchResponse.pagination, searchOnly);
  const combinedReasonSearch = {
    page: 1,
    limit: 10,
    sort: "newest",
    reason: keyword,
    search: keyword,
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const combinedResponse =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      administratorConnection,
      {
        productVariantId,
        body: combinedReasonSearch,
      },
    );
  typia.assert(combinedResponse);
  assertScoped(combinedResponse.data);
  assertPagination(combinedResponse.pagination, combinedReasonSearch);
  const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const to = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const rangedRequest = {
    page: 1,
    limit: 10,
    sort: "newest",
    createdAtFrom: from,
    createdAtTo: to,
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const rangedResponse =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      administratorConnection,
      {
        productVariantId,
        body: rangedRequest,
      },
    );
  typia.assert(rangedResponse);
  assertScoped(rangedResponse.data);
  assertPagination(rangedResponse.pagination, rangedRequest);
  TestValidator.predicate(
    "date ranged records should fall within the requested range when present",
    rangedResponse.data.every(
      (record) => record.createdAt >= from && record.createdAt <= to,
    ),
  );
  const oldestRequest = {
    page: 1,
    limit: 10,
    sort: "oldest",
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const oldestResponse =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      administratorConnection,
      {
        productVariantId,
        body: oldestRequest,
      },
    );
  typia.assert(oldestResponse);
  assertScoped(oldestResponse.data);
  assertPagination(oldestResponse.pagination, oldestRequest);
  if (oldestResponse.data.length > 1) {
    TestValidator.predicate(
      "oldest sort should order inventory records by createdAt ascending",
      oldestResponse.data.every(
        (record, index, array) =>
          index === 0 || array[index - 1].createdAt <= record.createdAt,
      ),
    );
  }
  const quantityAscRequest = {
    page: 1,
    limit: 10,
    sort: "quantityAsc",
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const quantityAscResponse =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      administratorConnection,
      {
        productVariantId,
        body: quantityAscRequest,
      },
    );
  typia.assert(quantityAscResponse);
  assertScoped(quantityAscResponse.data);
  assertPagination(quantityAscResponse.pagination, quantityAscRequest);
  if (quantityAscResponse.data.length > 1) {
    TestValidator.predicate(
      "quantityAsc sort should order inventory records by quantityChange ascending",
      quantityAscResponse.data.every(
        (record, index, array) =>
          index === 0 ||
          array[index - 1].quantityChange <= record.quantityChange,
      ),
    );
  }
  const quantityDescRequest = {
    page: 1,
    limit: 10,
    sort: "quantityDesc",
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const quantityDescResponse =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      administratorConnection,
      {
        productVariantId,
        body: quantityDescRequest,
      },
    );
  typia.assert(quantityDescResponse);
  assertScoped(quantityDescResponse.data);
  assertPagination(quantityDescResponse.pagination, quantityDescRequest);
  if (quantityDescResponse.data.length > 1) {
    TestValidator.predicate(
      "quantityDesc sort should order inventory records by quantityChange descending",
      quantityDescResponse.data.every(
        (record, index, array) =>
          index === 0 ||
          array[index - 1].quantityChange >= record.quantityChange,
      ),
    );
  }
}
