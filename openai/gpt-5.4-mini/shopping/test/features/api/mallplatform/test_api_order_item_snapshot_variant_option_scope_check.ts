import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_snapshot_variant_option_scope_check(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/registration",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const optionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "not found when the order item does not own the requested snapshot option",
    404,
    async () => {
      await api.functional.mallPlatform.seller.order_items.snapshots.variant_options.at(
        sellerConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          snapshotId,
          optionId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "not found when the option is outside the snapshot ownership chain",
    404,
    async () => {
      await api.functional.mallPlatform.seller.order_items.snapshots.variant_options.at(
        sellerConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          optionId,
        },
      );
    },
  );
}
