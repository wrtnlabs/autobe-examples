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
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_order_item_snapshots_variant_options_create } from "../../../generate/generate_random_mall_platform_seller_order_item_snapshots_variant_options_create";
import { prepare_random_mall_platform_order_item_snapshot_variant_option } from "../../../prepare/prepare_random_mall_platform_order_item_snapshot_variant_option";

export async function test_api_order_item_snapshot_variant_options_create(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Create a seller-authenticated request context and verify that normalized
   * variant option snapshot rows can be appended to an existing order item
   * snapshot without mutating previously stored option rows.
   *
   * 1. A seller account is registered and used through an isolated seller
   *    connection.
   * 2. An existing order item snapshot identifier is supplied by a valid UUID
   *    value so the endpoint can be exercised with a well-formed route.
   * 3. A first option row is created and validated, then a second option row is
   *    created for the same snapshot with a different option name.
   * 4. The first response is compared against a preserved copy to ensure the
   *    append-only insert did not modify the previously returned row.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const firstBody = {
    optionName: RandomGenerator.alphabets(8),
    optionValue: RandomGenerator.alphabets(10),
  } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate;
  const firstCreated =
    await generate_random_mall_platform_seller_order_item_snapshots_variant_options_create(
      sellerConnection,
      {
        params: { orderItemSnapshotId },
        body: firstBody,
      },
    );
  typia.assert(firstCreated);
  TestValidator.equals(
    "first created row keeps the requested option name",
    firstCreated.optionName,
    firstBody.optionName,
  );
  TestValidator.equals(
    "first created row keeps the requested option value",
    firstCreated.optionValue,
    firstBody.optionValue,
  );
  TestValidator.equals(
    "first created row is linked to the requested snapshot",
    firstCreated.orderItemSnapshot.id,
    orderItemSnapshotId,
  );
  TestValidator.predicate(
    "first created row has a generated identifier",
    firstCreated.id.length > 0,
  );
  TestValidator.predicate(
    "first created row has creation timestamp",
    firstCreated.createdAt.length > 0,
  );
  TestValidator.predicate(
    "first created row has update timestamp",
    firstCreated.updatedAt.length > 0,
  );
  const preservedFirst: IMallPlatformOrderItemSnapshotVariantOption = {
    ...firstCreated,
    orderItemSnapshot: { ...firstCreated.orderItemSnapshot },
  };
  const secondBody = {
    optionName: RandomGenerator.alphabets(9),
    optionValue: RandomGenerator.alphabets(11),
  } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate;
  TestValidator.notEquals(
    "second option name should differ from the first",
    secondBody.optionName,
    firstBody.optionName,
  );
  const secondCreated =
    await generate_random_mall_platform_seller_order_item_snapshots_variant_options_create(
      sellerConnection,
      {
        params: { orderItemSnapshotId },
        body: secondBody,
      },
    );
  typia.assert(secondCreated);
  TestValidator.equals(
    "second created row keeps the requested option name",
    secondCreated.optionName,
    secondBody.optionName,
  );
  TestValidator.equals(
    "second created row keeps the requested option value",
    secondCreated.optionValue,
    secondBody.optionValue,
  );
  TestValidator.equals(
    "second created row is linked to the same snapshot",
    secondCreated.orderItemSnapshot.id,
    orderItemSnapshotId,
  );
  TestValidator.notEquals(
    "each insert produces a distinct preserved row id",
    firstCreated.id,
    secondCreated.id,
  );
  TestValidator.equals(
    "append-only behavior preserves the first row id",
    firstCreated.id,
    preservedFirst.id,
  );
  TestValidator.equals(
    "append-only behavior preserves the first row option name",
    firstCreated.optionName,
    preservedFirst.optionName,
  );
  TestValidator.equals(
    "append-only behavior preserves the first row option value",
    firstCreated.optionValue,
    preservedFirst.optionValue,
  );
  TestValidator.equals(
    "append-only behavior preserves the first row snapshot linkage",
    firstCreated.orderItemSnapshot.id,
    preservedFirst.orderItemSnapshot.id,
  );
}
