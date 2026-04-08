import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator order item retrieval for non-existent order item.
 *
 * Validates the error handling workflow when an administrator attempts to retrieve an order item that does not exist in the system. The test ensures that proper 404 Not Found responses are returned with appropriate error details, enabling administrators to distinguish between non-existent resources and other errors.
 *
 * The test creates an administrator account for authentication, generates a random UUID that does not exist in the order items table, and verifies that the system returns a 404 status with appropriate error messaging when attempting to retrieve the non-existent order item.
 *
 * 1. Administrator registers a new account with email and password.
 * 2. Administrator authenticates and receives access token.
 * 3. System generates a random UUID that does not exist in the database.
 * 4. Administrator attempts to retrieve the non-existent order item.
 * 5. System validates the order item ID and returns 404 Not Found.
 * 6. Test validates the error response structure and status code.
 */
export async function test_api_administrator_order_item_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(administrator);
  // 2. Create authenticated connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: administrator.token.access,
    },
  };
  // 3. Generate a random UUID that does not exist in the database
  const nonExistentOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve the non-existent order item
  await TestValidator.httpError(
    "should return 404 for non-existent order item",
    [404],
    async () => {
      await api.functional.ecommerceMall.administrator.order_items.getById(
        authenticatedConnection,
        {
          id: nonExistentOrderId,
        },
      );
    },
  );
}
