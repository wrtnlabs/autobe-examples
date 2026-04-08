import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_inventory_records_lifecycle_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Test inventory records with no filters (base case)
  const allRecords =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecords);
  // Step 3: Test with pagination
  const paginatedRecords =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(paginatedRecords);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedRecords.data.length <= 10,
  );
  // Step 4: Test with specific productId filter
  const productId = typia.random<string & tags.Format<"uuid">>();
  const productFilteredRecords =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          productId,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(productFilteredRecords);
  // Step 5: Test with specific variantId filter
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const variantFilteredRecords =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          variantId,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(variantFilteredRecords);
  // Step 6: Test with reason filter
  const reasonFilteredRecords =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(reasonFilteredRecords);
  // Step 7: Test with date range filter
  const now = new Date();
  const fromDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toDate = now.toISOString();
  const dateFilteredRecords =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          dateRangeFrom: fromDate,
          dateRangeTo: toDate,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(dateFilteredRecords);
  // Step 8: Test with quantity direction - positive (stock increase)
  const positiveRecords =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          quantityDirection: "positive",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(positiveRecords);
  // Step 9: Test with quantity direction - negative (stock decrease)
  const negativeRecords =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          quantityDirection: "negative",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(negativeRecords);
  // Step 10: Test with sorting (ascending)
  const ascSortedRecords =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          sortField: "createdAt",
          sortDirection: "asc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(ascSortedRecords);
  // Step 11: Test with sorting (descending)
  const descSortedRecords =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          sortField: "createdAt",
          sortDirection: "desc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(descSortedRecords);
  // Step 12: Test combined filters
  const combinedFilteredRecords =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {
          productId: typia.random<string & tags.Format<"uuid">>(),
          reason: "order_placed",
          quantityDirection: "negative",
          page: 1,
          limit: 5,
          sortField: "createdAt",
          sortDirection: "desc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(combinedFilteredRecords);
  // Step 13: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    combinedFilteredRecords.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    combinedFilteredRecords.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    combinedFilteredRecords.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    combinedFilteredRecords.pagination.pages >= 0,
  );
}
