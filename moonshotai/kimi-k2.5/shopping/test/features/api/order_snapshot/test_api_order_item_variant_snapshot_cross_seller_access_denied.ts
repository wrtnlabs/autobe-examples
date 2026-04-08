import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_variant_snapshot_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Seller A (legitimate owner) connection
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IEcommerceMallSeller.IJoin;
  await authorize_seller_join(sellerAConnection, { body: sellerAJoinBody });
  // Step 2: Create Seller B (attacker) connection
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IEcommerceMallSeller.IJoin;
  await authorize_seller_join(sellerBConnection, { body: sellerBJoinBody });
  // Step 3: Generate random order and orderItem IDs to simulate cross-seller access attempt
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Attempt access as Seller B - should fail with authorization/404 error
  await TestValidator.error(
    "Seller B cannot access Seller A's order item variant snapshot",
    async () => {
      await api.functional.ecommerceMall.seller.orders.items.variantSnapshot.invert(
        sellerBConnection,
        {
          orderId,
          orderItemId,
        },
      );
    },
  );
  // Also verify that Seller A's connection works but Seller B's doesn't
  TestValidator.notEquals(
    "Seller A and Seller B should have different IDs",
    sellerAConnection.headers?.Authorization ?? "",
    sellerBConnection.headers?.Authorization ?? "",
  );
  // Test that Seller B's unauthorized attempt fails
  await TestValidator.error(
    "Cross-seller access denied for variant snapshot",
    async () => {
      await api.functional.ecommerceMall.seller.orders.items.variantSnapshot.invert(
        sellerBConnection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
