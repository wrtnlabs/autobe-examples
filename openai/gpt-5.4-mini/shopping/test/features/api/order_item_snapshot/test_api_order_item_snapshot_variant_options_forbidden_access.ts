import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_variant_options_forbidden_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that a customer cannot inspect preserved variant option rows from another customer's order item snapshot.
   *
   * The test creates a valid authenticated customer session, then attempts to access the variant option snapshot endpoint using a random snapshot identifier that does not belong to the caller.
   *
   * It validates that the API enforces snapshot-level access control by rejecting the request with a forbidden response and not exposing preserved option rows or snapshot data.
   *
   * 1. Register and authenticate a customer account.
   * 2. Attempt to access a different order item snapshot's preserved variant options.
   * 3. Confirm the endpoint rejects the request with forbidden access.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.mallPlatform.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
        ip: "127.0.0.1",
      } satisfies IMallPlatformCustomer.IJoin,
    },
  );
  typia.assert(authorized);
  await TestValidator.httpError(
    "forbidden access to another customer's order item snapshot variant options",
    403,
    async () => {
      await api.functional.mallPlatform.customer.orderItemSnapshots.variantOptions.index(
        customerConnection,
        {
          orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
        },
      );
    },
  );
}
