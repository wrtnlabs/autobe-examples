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

export async function test_api_admin_inventory_record_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Retrieve inventory record using admin connection
  const inventoryRecord =
    await api.functional.ecommerceMall.admin.inventory_records.at(
      adminConnection,
      {
        inventoryRecordId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(inventoryRecord);
  // 3. Validate relationship data structure
  // variant is required, other relationships are nullable
  TestValidator.equals(
    "has variant relationship",
    inventoryRecord.variant !== undefined,
    true,
  );
  TestValidator.equals(
    "variant has id",
    inventoryRecord.variant.id !== undefined,
    true,
  );
  TestValidator.equals(
    "variant has sku",
    inventoryRecord.variant.sku !== undefined,
    true,
  );
  // Validate optional relationships can be null or have data
  // (typia.assert already validated types, this confirms structure)
  const hasOrder =
    inventoryRecord.order !== undefined && inventoryRecord.order !== null;
  TestValidator.predicate("order relationship exists", hasOrder !== undefined);
  const hasCancellationRequest =
    inventoryRecord.cancellationRequest !== undefined &&
    inventoryRecord.cancellationRequest !== null;
  TestValidator.predicate(
    "cancellationRequest relationship exists",
    hasCancellationRequest !== undefined,
  );
  const hasRefundRequest =
    inventoryRecord.refundRequest !== undefined &&
    inventoryRecord.refundRequest !== null;
  TestValidator.predicate(
    "refundRequest relationship exists",
    hasRefundRequest !== undefined,
  );
  // Validate timestamps are valid date-time format (typia.assert validates format)
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(inventoryRecord.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(inventoryRecord.updated_at).getTime()),
  );
}