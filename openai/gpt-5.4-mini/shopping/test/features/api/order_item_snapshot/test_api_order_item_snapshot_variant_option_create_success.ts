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

export async function test_api_order_item_snapshot_variant_option_create_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234abcd!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const firstBody = {
    optionName: "color",
    optionValue: "red",
  } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate;
  const created =
    await generate_random_mall_platform_customer_order_item_snapshots_variant_options_create(
      customerConnection,
      {
        params: {
          orderItemSnapshotId,
        },
        body: firstBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "snapshot id matches",
    created.orderItemSnapshot.id,
    orderItemSnapshotId,
  );
  TestValidator.equals(
    "option name preserved",
    created.optionName,
    firstBody.optionName,
  );
  TestValidator.equals(
    "option value preserved",
    created.optionValue,
    firstBody.optionValue,
  );
  const secondBody = {
    optionName: "size",
    optionValue: "large",
  } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate;
  const createdSecond =
    await generate_random_mall_platform_customer_order_item_snapshots_variant_options_create(
      customerConnection,
      {
        params: {
          orderItemSnapshotId,
        },
        body: secondBody,
      },
    );
  typia.assert(createdSecond);
  TestValidator.equals(
    "second snapshot id matches",
    createdSecond.orderItemSnapshot.id,
    orderItemSnapshotId,
  );
  TestValidator.equals(
    "second option name preserved",
    createdSecond.optionName,
    secondBody.optionName,
  );
  TestValidator.equals(
    "second option value preserved",
    createdSecond.optionValue,
    secondBody.optionValue,
  );
  TestValidator.notEquals(
    "created rows should differ",
    created.id,
    createdSecond.id,
  );
}
