import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_records_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform and gets authenticated
  const joinResult = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create seller-specific connection with the token
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  sellerConnection.headers = {
    Authorization: joinResult.token.access,
  };
  // 3. Request inventory records (empty body to get all records)
  const result =
    await api.functional.ecommerceMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    result.pagination !== undefined,
    true,
  );
  // 5. Validate pagination metadata
  const { pagination } = result;
  TestValidator.predicate("current page is valid", pagination.current >= 1);
  TestValidator.predicate("limit is valid", pagination.limit >= 0);
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  // 6. Validate pages calculation (pages = ceil(records / limit) if records > 0)
  const expectedPages =
    pagination.records > 0 && pagination.limit > 0
      ? Math.ceil(pagination.records / pagination.limit)
      : 0;
  TestValidator.equals(
    "pages calculated correctly",
    pagination.pages,
    expectedPages,
  );
  // 7. Validate data array exists and is an array
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  // 8. If there are records, validate each inventory record
  if (result.data.length > 0) {
    // 8.1 Validate each record has required fields
    result.data.forEach((record, index) => {
      const prefix = `record[${index}]`;
      // Required fields
      TestValidator.notEquals(`${prefix} has id`, record.id, null);
      TestValidator.notEquals(
        `${prefix} has variant_id`,
        record.variant_id,
        null,
      );
      TestValidator.notEquals(
        `${prefix} has quantity_change`,
        record.quantity_change,
        null,
      );
      TestValidator.notEquals(
        `${prefix} has remaining_quantity`,
        record.remaining_quantity,
        null,
      );
      TestValidator.notEquals(`${prefix} has reason`, record.reason, null);
      TestValidator.notEquals(`${prefix} has type`, record.type, null);
      TestValidator.notEquals(
        `${prefix} has created_at`,
        record.created_at,
        null,
      );
      // 8.2 Validate quantity_change is negative for sales (business logic)
      // If this is a sale record, quantity_change should be negative
      if (record.reason === "SALE") {
        TestValidator.predicate(
          `${prefix} sale has negative quantity_change`,
          record.quantity_change < 0,
        );
      }
      // 8.3 Validate type is OUTGOING for sales
      if (record.reason === "SALE") {
        TestValidator.equals(
          `${prefix} sale type is OUTGOING`,
          record.type,
          "OUTGOING",
        );
      }
      // 8.4 Validate soft-deleted records are filtered out (deleted_at is null)
      TestValidator.equals(
        `${prefix} not soft-deleted`,
        record.deleted_at,
        null,
      );
      // 8.5 Validate created_at is a valid date-time string
      TestValidator.predicate(
        `${prefix} created_at is valid date-time`,
        !isNaN(Date.parse(record.created_at)),
      );
    });
    // 9. Validate records are ordered by created_at descending (newest first)
    for (let i = 1; i < result.data.length; i++) {
      const prevRecord = result.data[i - 1];
      const currentRecord = result.data[i];
      TestValidator.predicate(
        `records ordered by created_at descending`,
        new Date(prevRecord.created_at).getTime() >=
          new Date(currentRecord.created_at).getTime(),
      );
    }
  }
}
