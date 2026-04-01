import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_snapshot_variant_options_browse(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "snapshot variant options browse should not expose data for unknown scope",
    async () => {
      await api.functional.mallPlatform.administrator.order_items.snapshots.variant_options.index(
        adminConnection,
        {
          orderItemId,
          snapshotId,
          body: {
            search: RandomGenerator.alphabets(5),
            page: 1,
            limit: 10,
            sort: "+createdAt",
          } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
        },
      );
    },
  );
  await TestValidator.error(
    "different snapshot id should also be rejected or return no accessible data",
    async () => {
      await api.functional.mallPlatform.administrator.order_items.snapshots.variant_options.index(
        adminConnection,
        {
          orderItemId,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            search: RandomGenerator.alphabets(5),
            page: 1,
            limit: 5,
            sort: "+createdAt",
          } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
        },
      );
    },
  );
}
