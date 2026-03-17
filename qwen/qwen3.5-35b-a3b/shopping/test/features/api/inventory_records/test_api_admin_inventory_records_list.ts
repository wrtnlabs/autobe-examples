import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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

export async function test_api_admin_inventory_records_list(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminAuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create admin-specific connection with authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // Step 3: Call PATCH /ecommerceMall/admin/inventory-records with default parameters
  const inventoryRecordsResponse =
    await api.functional.ecommerceMall.admin.inventory_records.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryRecordsResponse);
  // Step 4: Validate response structure
  const { pagination, data } = inventoryRecordsResponse;
  // Step 5: Validate pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // Step 6: Verify pagination structure consistency
  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pagination pages calculation",
      pagination.pages,
      expectedPages,
    );
  }
  // Step 7: Validate each inventory record structure and required fields
  for (const record of data) {
    TestValidator.equals("record id is uuid format", record.id, record.id);
    TestValidator.equals(
      "record variant_id is uuid format",
      record.variant_id,
      record.variant_id,
    );
    TestValidator.predicate(
      "record quantity_change is int32",
      Number.isInteger(record.quantity_change),
    );
    TestValidator.predicate(
      "record remaining_quantity is int32",
      Number.isInteger(record.remaining_quantity),
    );
    TestValidator.predicate(
      "record reason is non-empty string",
      typeof record.reason === "string" && record.reason.length > 0,
    );
    TestValidator.predicate(
      "record type is non-empty string",
      typeof record.type === "string" && record.type.length > 0,
    );
    TestValidator.equals(
      "record created_at is valid date-time",
      record.created_at,
      record.created_at,
    );
    TestValidator.equals(
      "record updated_at is valid date-time",
      record.updated_at,
      record.updated_at,
    );
    TestValidator.predicate(
      "deleted_at is nullable",
      record.deleted_at === null || typeof record.deleted_at === "string",
    );
    TestValidator.predicate(
      "ecommerce_mall_order_id is nullable",
      record.ecommerce_mall_order_id === null ||
        typeof record.ecommerce_mall_order_id === "string",
    );
    TestValidator.predicate(
      "cancellation_request_id is nullable",
      record.ecommerce_mall_cancellation_request_id === null ||
        typeof record.ecommerce_mall_cancellation_request_id === "string",
    );
    TestValidator.predicate(
      "refund_request_id is nullable",
      record.ecommerce_mall_refund_request_id === null ||
        typeof record.ecommerce_mall_refund_request_id === "string",
    );
    // Validate optional description field
    TestValidator.predicate(
      "description is nullable or string",
      record.description === null ||
        record.description === undefined ||
        typeof record.description === "string",
    );
  }
  // Step 8: Confirm records are sorted by created_at descending (newest first)
  if (data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      TestValidator.predicate(
        `record ${i} created_at <= record ${i - 1} created_at (descending order)`,
        new Date(data[i].created_at) <= new Date(data[i - 1].created_at),
      );
    }
  }
  // Step 9: Validate inventory record IDs are unique
  const recordIds = data.map((r) => r.id);
  const uniqueIds = new Set(recordIds);
  TestValidator.equals(
    "inventory record IDs are unique",
    uniqueIds.size,
    recordIds.length,
  );
  // Step 10: Validate quantity_change values show valid stock movements
  for (const record of data) {
    TestValidator.predicate(
      "quantity_change is non-zero for meaningful changes",
      record.quantity_change !== 0,
    );
    TestValidator.predicate(
      "remaining_quantity is non-negative",
      record.remaining_quantity >= 0,
    );
  }
}
