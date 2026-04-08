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

export async function test_api_admin_inventory_records_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using utility function
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
  // Step 2: Request page 1 with limit=5 to test pagination
  const page1Body = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IEcommerceMallInventoryRecord.IRequest;
  const page1Result =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      { body: page1Body },
    );
  typia.assert(page1Result);
  // Step 3: Validate pagination metadata
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1Result.pagination.pages >= 0,
  );
  // Properties match the IEcommerceMallInventoryRecord.ISummary structure
  for (const record of page1Result.data) {
    typia.assert(record);
    TestValidator.predicate("record has id", typeof record.id === "string");
    TestValidator.predicate(
      "record has variant with skuCode",
      record.variant && typeof record.variant.skuCode === "string",
    );
    TestValidator.predicate(
      "record has variant options",
      Array.isArray(record.variant.options),
    );
    TestValidator.predicate(
      "record has quantityChange",
      typeof record.quantityChange === "number",
    );
    TestValidator.predicate(
      "record has reason",
      typeof record.reason === "string",
    );
    TestValidator.predicate(
      "record has createdAt",
      typeof record.createdAt === "string",
    );
  }
  // Step 4: Test subsequent pages if more records exist
  if (page1Result.pagination.pages > 1) {
    // Request page 2
    const page2Body = {
      page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 5 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies IEcommerceMallInventoryRecord.IRequest;
    const page2Result =
      await api.functional.ecommerceMall.admin.inventory_records.index(
        adminConnection,
        { body: page2Body },
      );
    typia.assert(page2Result);
    TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
    // Verify different records are returned (no overlap by ID)
    const page1Ids = new Set(page1Result.data.map((r) => r.id));
    const page2Ids = page2Result.data.map((r) => r.id);
    const overlap = page2Ids.some((id) => page1Ids.has(id));
    TestValidator.predicate(
      "page 1 and page 2 have different records",
      !overlap,
    );
    // Request page 3 if available
    if (page2Result.pagination.pages > 2) {
      const page3Body = {
        page: 3 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallInventoryRecord.IRequest;
      const page3Result =
        await api.functional.ecommerceMall.admin.inventory_records.index(
          adminConnection,
          { body: page3Body },
        );
      typia.assert(page3Result);
      TestValidator.equals("page 3 current", page3Result.pagination.current, 3);
    }
  }
  // Step 5: Test sorting with createdAt asc (oldest first)
  const ascBody = {
    page: 1,
    limit: 5,
    sortField: "createdAt",
    sortDirection: "asc" as const,
  } satisfies IEcommerceMallInventoryRecord.IRequest;
  const ascResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      { body: ascBody },
    );
  typia.assert(ascResult);
  // Step 6: Test sorting with createdAt desc (newest first)
  const descBody = {
    page: 1,
    limit: 5,
    sortField: "createdAt",
    sortDirection: "desc" as const,
  } satisfies IEcommerceMallInventoryRecord.IRequest;
  const descResult =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      { body: descBody },
    );
  typia.assert(descResult);
  // If both have data, verify they are in different orders (first record should differ)
  if (ascResult.data.length > 0 && descResult.data.length > 0) {
    const ascFirstId = ascResult.data[0]!.id;
    const descFirstId = descResult.data[0]!.id;
    TestValidator.notEquals(
      "asc and desc sorting produce different first records",
      ascFirstId,
      descFirstId,
    );
  }
  // Step 7: Verify quantityChange signs (positive for increases, negative for decreases)
  const allRecords = [
    ...page1Result.data,
    ...ascResult.data,
    ...descResult.data,
  ];
  if (allRecords.length > 0) {
    const hasPositive = allRecords.some((r) => r.quantityChange > 0);
    const hasNegative = allRecords.some((r) => r.quantityChange < 0);
    // Test different quantity directions if available
    if (hasPositive) {
      const positiveFilter: IEcommerceMallInventoryRecord.IRequest = {
        page: 1,
        limit: 10,
        quantityDirection: "positive" as const,
      } satisfies IEcommerceMallInventoryRecord.IRequest;
      const positiveResult =
        await api.functional.ecommerceMall.admin.inventory_records.index(
          adminConnection,
          { body: positiveFilter },
        );
      typia.assert(positiveResult);
      // All returned records should have positive quantityChange
      for (const record of positiveResult.data) {
        TestValidator.predicate(
          "positive filter returns only positive quantity changes",
          record.quantityChange > 0,
        );
      }
    }
    if (hasNegative) {
      const negativeFilter: IEcommerceMallInventoryRecord.IRequest = {
        page: 1,
        limit: 10,
        quantityDirection: "negative" as const,
      } satisfies IEcommerceMallInventoryRecord.IRequest;
      const negativeResult =
        await api.functional.ecommerceMall.admin.inventory_records.index(
          adminConnection,
          { body: negativeFilter },
        );
      typia.assert(negativeResult);
      // All returned records should have negative quantityChange
      for (const record of negativeResult.data) {
        TestValidator.predicate(
          "negative filter returns only negative quantity changes",
          record.quantityChange < 0,
        );
      }
    }
  }
}
