import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_inventory_restoration_cancellation_request_details(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Generate a random restoration ID to test retrieval
  const restorationId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to get inventory restoration record
  const restoration =
    await api.functional.ecommerce.administrator.modification_inventory_restorations.at(
      adminConnection,
      { restorationId },
    );
  // Validate the response structure
  typia.assert(restoration);
  // Additional business logic validation
  TestValidator.equals("restoration ID matches", restoration.id, restorationId);
  TestValidator.predicate(
    "quantity restored positive",
    restoration.quantity_restored > 0,
  );
  TestValidator.notEquals(
    "restoration reason not empty",
    restoration.restoration_reason,
    "",
  );
  // Check cancellation request relationship (may be null or undefined depending on data)
  if (
    restoration.cancellationRequest !== null &&
    restoration.cancellationRequest !== undefined
  ) {
    typia.assert(restoration.cancellationRequest);
    TestValidator.equals(
      "cancellation request has ID",
      typeof restoration.cancellationRequest.id,
      "string",
    );
  }
  // Check inventory record relationship (required)
  typia.assert(restoration.inventoryRecord);
  TestValidator.equals(
    "inventory record has ID",
    typeof restoration.inventoryRecord.id,
    "string",
  );
  // Check timestamps
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(restoration.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(restoration.updated_at)),
  );
}
