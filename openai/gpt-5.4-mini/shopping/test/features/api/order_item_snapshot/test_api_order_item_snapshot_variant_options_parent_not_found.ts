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

export async function test_api_order_item_snapshot_variant_options_parent_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that variant option creation for an order item snapshot rejects missing parents.
   *
   * This test authenticates an administrator, then attempts to create a preserved
   * snapshot variant option using a snapshot UUID that is not expected to exist.
   * It validates the endpoint's parent-resource dependency and ensures the API
   * rejects orphaned historical rows when the target snapshot cannot be found.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Call the variant option creation endpoint with a non-existent snapshot UUID.
   * 3. Assert that the request fails with a not-found business error.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "order item snapshot variant option parent not found",
    [404],
    async () => {
      await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.create(
        adminConnection,
        {
          orderItemSnapshotId:
            "00000000-0000-0000-0000-000000000000" as string &
              tags.Format<"uuid">,
          body: {
            optionName: RandomGenerator.alphabets(6),
            optionValue: RandomGenerator.alphabets(8),
          } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate,
        },
      );
    },
  );
}
