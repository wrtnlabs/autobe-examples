import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test the error case when attempting to retrieve an order item that does not exist.
 *
 * Validates that the system properly returns a 404 Not Found error for invalid order item IDs,
 * ensuring proper error handling and preventing information disclosure. This test verifies
 * the boundary condition where requested resources don't exist, ensuring the API handles
 * this gracefully without leaking database structure or security information.
 *
 * 1. Super administrator joins to obtain authentication token
 * 2. Create a fabricated UUID that does not exist in the database
 * 3. Attempt to retrieve the non-existent order item using the fabricated UUID
 * 4. Verify HTTP 404 Not Found status code is returned
 * 5. Verify response contains appropriate error information indicating order item was not found
 * 6. Verify no order item data is returned in the response
 * 7. Test with valid UUID format but non-existent ID to distinguish between format validation and existence validation
 * 8. Ensure error message is user-friendly but does not expose sensitive system information
 */
export async function test_api_order_item_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IEcommerceMallSuperAdministrator.IJoin,
  });
  // 2. Create fabricated UUID that does not exist in the database
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  // 3-5. Attempt to retrieve non-existent order item and verify 404 response
  await TestValidator.httpError(
    "should return 404 for non-existent order item",
    [404],
    async () => {
      await api.functional.ecommerceMall.superAdministrator.order_items.at(
        superAdminConnection,
        { id: fakeOrderId },
      );
    },
  );
  // 6-8. Validate that error message is user-friendly and doesn't expose sensitive information
  await TestValidator.httpError(
    "error message should indicate order item not found",
    [404],
    async () => {
      await api.functional.ecommerceMall.superAdministrator.order_items.at(
        superAdminConnection,
        { id: fakeOrderId },
      );
    },
  );
}
