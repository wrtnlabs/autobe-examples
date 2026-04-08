import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_variant_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the customer actor following the isolation pattern
  const customerConnection: api.IConnection = { host: connection.host };
  // Authenticate as customer using the utility function
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Generate a random UUID that absolutely does not exist in the system
  const nonExistentOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // Verify that requesting variant snapshot for non-existent order item returns 404
  await TestValidator.httpError(
    "returns 404 Not Found for non-existent order item ID",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.orderItems.variantSnapshot.at(
        customerConnection,
        {
          orderItemId: nonExistentOrderItemId,
        },
      );
    },
  );
}
