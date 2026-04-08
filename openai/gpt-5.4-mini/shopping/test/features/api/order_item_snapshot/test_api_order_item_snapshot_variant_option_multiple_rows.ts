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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_item_snapshots_variant_options_create } from "../../../generate/generate_random_mall_platform_customer_order_item_snapshots_variant_options_create";
import { prepare_random_mall_platform_order_item_snapshot_variant_option } from "../../../prepare/prepare_random_mall_platform_order_item_snapshot_variant_option";

export async function test_api_order_item_snapshot_variant_option_multiple_rows(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await generate_random_mall_platform_customer_order_item_snapshots_variant_options_create(
      customerConnection,
      {
        params: { orderItemSnapshotId },
        body: {
          optionName: "color",
          optionValue: "red",
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate,
      },
    );
  typia.assert(first);
  const second =
    await generate_random_mall_platform_customer_order_item_snapshots_variant_options_create(
      customerConnection,
      {
        params: { orderItemSnapshotId },
        body: {
          optionName: "size",
          optionValue: "large",
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate,
      },
    );
  typia.assert(second);
  const third =
    await generate_random_mall_platform_customer_order_item_snapshots_variant_options_create(
      customerConnection,
      {
        params: { orderItemSnapshotId },
        body: {
          optionName: "material",
          optionValue: "cotton",
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate,
      },
    );
  typia.assert(third);
  TestValidator.equals(
    "first option row preserved",
    first.orderItemSnapshot.id,
    orderItemSnapshotId,
  );
  TestValidator.equals(
    "second option row preserved",
    second.orderItemSnapshot.id,
    orderItemSnapshotId,
  );
  TestValidator.equals(
    "third option row preserved",
    third.orderItemSnapshot.id,
    orderItemSnapshotId,
  );
  TestValidator.notEquals(
    "different option rows do not overwrite each other",
    first.optionName,
    second.optionName,
  );
  TestValidator.notEquals(
    "second and third option rows remain distinct",
    second.optionName,
    third.optionName,
  );
}
