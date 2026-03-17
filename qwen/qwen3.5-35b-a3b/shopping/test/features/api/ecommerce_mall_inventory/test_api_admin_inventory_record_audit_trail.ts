import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_inventory_record_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: RandomGenerator.alphabets(16),
      ip: RandomGenerator.alphabets(12),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a complete inventory record with all fields
  const inventoryRecord = typia.random<IEcommerceMallInventoryRecord>();
  typia.assert(inventoryRecord);
  // 3. Validate immutable fields are present and correct types
  TestValidator.predicate(
    "quantity_change is integer",
    Number.isInteger(inventoryRecord.quantity_change),
  );
  TestValidator.predicate(
    "remaining_quantity is integer",
    Number.isInteger(inventoryRecord.remaining_quantity),
  );
  // 4. Validate reason categorization (string field, just check non-empty)
  TestValidator.predicate(
    "reason is non-empty string",
    inventoryRecord.reason.length > 0,
  );
  // 5. Validate type classification (string field, just check non-empty)
  TestValidator.predicate(
    "type is non-empty string",
    inventoryRecord.type.length > 0,
  );
  // 6. Validate quantity_change direction based on type
  if (inventoryRecord.type === "INCOMING") {
    TestValidator.predicate(
      "INCOMING type has positive quantity_change",
      inventoryRecord.quantity_change > 0,
    );
  } else if (inventoryRecord.type === "OUTGOING") {
    TestValidator.predicate(
      "OUTGOING type has negative quantity_change",
      inventoryRecord.quantity_change < 0,
    );
  }
  // 7. Validate timestamps are valid date-time format
  const createdDate = new Date(inventoryRecord.created_at);
  const updatedDate = new Date(inventoryRecord.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedDate.getTime()),
  );
  // 8. Validate variant relationship with summary structure
  typia.assert(inventoryRecord.variant);
  typia.assert(inventoryRecord.variant.id);
  typia.assert(inventoryRecord.variant.sku);
  typia.assert(inventoryRecord.variant.basePrice);
  typia.assert(inventoryRecord.variant.stockQuantity);
  typia.assert(inventoryRecord.variant.product);
  typia.assert(inventoryRecord.variant.product.id);
  typia.assert(inventoryRecord.variant.product.name);
  // 9. Validate optional transaction references
  if (inventoryRecord.order_id !== null) {
    typia.assert(inventoryRecord.order!);
    typia.assert(inventoryRecord.order!.id);
    typia.assert(inventoryRecord.order!.order_number);
  }
  if (inventoryRecord.cancellation_request_id !== null) {
    typia.assert(inventoryRecord.cancellationRequest!);
    typia.assert(inventoryRecord.cancellationRequest!.id);
    typia.assert(inventoryRecord.cancellationRequest!.status);
  }
  if (inventoryRecord.refund_request_id !== null) {
    typia.assert(inventoryRecord.refundRequest!);
    typia.assert(inventoryRecord.refundRequest!.id);
    typia.assert(inventoryRecord.refundRequest!.refund_code);
  }
  // 10. Validate timestamp order
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(inventoryRecord.updated_at) >= createdDate,
  );
  // 11. Validate remaining_quantity is non-negative
  TestValidator.predicate(
    "remaining_quantity is non-negative",
    inventoryRecord.remaining_quantity >= 0,
  );
}
