import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_order_item_snapshots_variant_options_create } from "../../../generate/generate_random_mall_platform_administrator_order_item_snapshots_variant_options_create";
import { prepare_random_mall_platform_order_item_snapshot_variant_option } from "../../../prepare/prepare_random_mall_platform_order_item_snapshot_variant_option";

export async function test_api_order_item_snapshot_variant_option_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.administrator.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const created =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.create(
      adminConnection,
      {
        orderItemSnapshotId,
        body: {
          optionName: RandomGenerator.name(1),
          optionValue: RandomGenerator.name(1),
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate,
      },
    );
  typia.assert(created);
  const fetched =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.getByOrderitemsnapshotidAndVariantoptionid(
      adminConnection,
      {
        orderItemSnapshotId,
        variantOptionId: created.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("variant option id", fetched.id, created.id);
  TestValidator.equals(
    "parent snapshot id",
    fetched.orderItemSnapshot.id,
    created.orderItemSnapshot.id,
  );
  TestValidator.equals("option name", fetched.optionName, created.optionName);
  TestValidator.equals(
    "option value",
    fetched.optionValue,
    created.optionValue,
  );
  TestValidator.equals("created at", fetched.createdAt, created.createdAt);
  TestValidator.equals("updated at", fetched.updatedAt, created.updatedAt);
  TestValidator.equals("deleted at", fetched.deletedAt, created.deletedAt);
  TestValidator.equals(
    "snapshot reference preserved",
    fetched.orderItemSnapshot.id,
    orderItemSnapshotId,
  );
  await TestValidator.httpError(
    "not found for mismatched snapshot",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.getByOrderitemsnapshotidAndVariantoptionid(
        adminConnection,
        {
          orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
          variantOptionId: created.id,
        },
      );
    },
  );
}
