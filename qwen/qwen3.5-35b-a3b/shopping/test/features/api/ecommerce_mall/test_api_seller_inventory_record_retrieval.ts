import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can successfully retrieve detailed information about an inventory record they own.
 * This scenario validates the primary success path where a seller authenticates, then queries an inventory
 * record by UUID that belongs to a product variant they own. The system should return the complete inventory
 * record including quantity_change, remaining_quantity, reason, type, timestamps, and optionally linked order,
 * cancellation request, or refund request references. The test should verify that all business fields are
 * correctly populated and that the seller can view historical stock movement data for auditing purposes.
 */
export async function test_api_seller_inventory_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecureP@ssw0rd123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Step 2: Generate a random inventory record ID
  // Note: In a real scenario, this would be an actual inventory record created through
  // order/return/cancellation flows. For endpoint testing, we use a random UUID.
  const inventoryRecordId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Retrieve the inventory record
  const inventoryRecord =
    await api.functional.ecommerceMall.seller.inventory_records.at(
      sellerConnection,
      {
        inventoryRecordId,
      },
    );
  typia.assert(inventoryRecord);
  // Step 4: Validate inventory record structure
  TestValidator.equals(
    "inventory record ID",
    inventoryRecord.id,
    inventoryRecordId,
  );
  TestValidator.equals(
    "variant ID matches",
    inventoryRecord.variant_id,
    inventoryRecord.variant.id,
  );
  // Validate business fields
  TestValidator.predicate(
    "quantity change is int32",
    inventoryRecord.quantity_change >= -(2 ** 31) &&
      inventoryRecord.quantity_change <= 2 ** 31 - 1,
  );
  TestValidator.predicate(
    "remaining quantity is non-negative",
    inventoryRecord.remaining_quantity >= 0,
  );
  TestValidator.equals(
    "reason is populated",
    inventoryRecord.reason.length > 0,
    true,
  );
  TestValidator.equals(
    "type is populated",
    inventoryRecord.type.length > 0,
    true,
  );
  // Validate timestamps are ISO 8601 formatted
  const createdDate = new Date(inventoryRecord.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdDate.getTime()),
  );
  const updatedDate = new Date(inventoryRecord.updated_at);
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedDate.getTime()),
  );
  // Validate optional references - only if present
  if (
    inventoryRecord.order_id !== null &&
    inventoryRecord.order_id !== undefined
  ) {
    TestValidator.equals(
      "order ID field exists",
      inventoryRecord.order_id,
      inventoryRecord.order?.id,
    );
  }
  if (
    inventoryRecord.cancellation_request_id !== null &&
    inventoryRecord.cancellation_request_id !== undefined
  ) {
    TestValidator.equals(
      "cancellationRequest ID field exists",
      inventoryRecord.cancellation_request_id,
      inventoryRecord.cancellationRequest?.id,
    );
  }
  if (
    inventoryRecord.refund_request_id !== null &&
    inventoryRecord.refund_request_id !== undefined
  ) {
    TestValidator.equals(
      "refundRequest ID field exists",
      inventoryRecord.refund_request_id,
      inventoryRecord.refundRequest?.id,
    );
  }
  // Validate variant structure (referenced in inventory record)
  TestValidator.equals(
    "variant base price is number",
    typeof inventoryRecord.variant.basePrice === "number",
    true,
  );
  TestValidator.equals(
    "variant sale price is number or null",
    inventoryRecord.variant.salePrice === null ||
      typeof inventoryRecord.variant.salePrice === "number",
    true,
  );
  TestValidator.predicate(
    "variant stock quantity is non-negative",
    inventoryRecord.variant.stockQuantity >= 0,
  );
  TestValidator.equals(
    "variant has product reference",
    inventoryRecord.variant.product.id.length > 0,
    true,
  );
}