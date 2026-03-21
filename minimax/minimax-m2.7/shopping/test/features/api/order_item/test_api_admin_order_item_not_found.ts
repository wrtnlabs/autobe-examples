import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin receives 404 error when attempting to retrieve a non-existent order item.
 *
 * This test validates the edge case handling for invalid order item identifiers.
 * 1. Authenticate as admin via POST /ecommerceMall/auth/admin/join
 * 2. Call GET /ecommerceMall/admin/order-items/{orderItemId} with a UUID that does not exist
 * 3. Validate the response returns a 404 status code with appropriate error message
 */
export async function test_api_admin_order_item_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
    },
  });
  // Step 2: Generate a non-existent UUID for the order item
  const nonExistentOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Validate that retrieving a non-existent order item returns 404
  await TestValidator.httpError(
    "should return 404 for non-existent order item",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.order_items.at(adminConnection, {
        orderItemId: nonExistentOrderItemId,
      }),
  );
}
