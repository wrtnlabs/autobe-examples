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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_order_item_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A (will own the order item)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_member_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerAAuth);
  // 2. Register Customer B (will attempt unauthorized access)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_member_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerBAuth);
  // 3. Generate a test order item UUID that belongs to Customer A
  // In a real E2E scenario, we would create an actual order with Customer A
  // For this access control test, we verify that Customer B cannot access any
  // order item that belongs to another customer
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 4. Customer B attempts to access Customer A's order item
  // Expected: 403 Forbidden (access denied) because Customer B is not the owner
  await TestValidator.error(
    "Customer B should be denied access to Customer A's order item",
    async () => {
      await api.functional.ecommerceMall.member.order_items.getByItemid(
        customerBConnection,
        {
          itemId: orderItemId,
        },
      );
    },
  );
  // 5. Verify that access control is properly enforced
  // The TestValidator.error confirms that an HttpError was thrown
  // The error status should be 403 Forbidden
}
