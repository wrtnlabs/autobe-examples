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

/**
 * Verify missing order item snapshot handling for preserved variant option lookup.
 *
 * This test authenticates an administrator and exercises the historical order item snapshot variant option lookup endpoint with a well-formed UUID pair where the parent order item snapshot does not exist.
 *
 * The scenario focuses on not-found behavior for immutable historical snapshot reads. It ensures the endpoint fails consistently when the snapshot identifier is absent and does not expose unrelated preserved option data or fall back to any current product or variant state.
 *
 * 1. Authenticate as an administrator using the protected join flow.
 * 2. Request a variant option from a non-existent order item snapshot using valid UUID identifiers.
 * 3. Assert the endpoint fails with a not-found-style error.
 */
export async function test_api_order_item_snapshot_variant_option_snapshot_missing(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantOptionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "missing order item snapshot should fail as not found",
    async () => {
      await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.getByOrderitemsnapshotidAndVariantoptionid(
        administratorConnection,
        {
          orderItemSnapshotId,
          variantOptionId,
        },
      );
    },
  );
}
