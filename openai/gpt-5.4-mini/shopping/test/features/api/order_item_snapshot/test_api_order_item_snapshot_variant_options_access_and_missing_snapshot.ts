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

export async function test_api_order_item_snapshot_variant_options_access_and_missing_snapshot(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies administrator-only access and missing snapshot behavior for preserved order item snapshot variant options.
   *
   * This scenario validates two business rules for the historical variant option browse endpoint.
   * First, it ensures the endpoint cannot be accessed through an unauthenticated connection.
   * Second, it confirms that an authenticated administrator receives a not-found failure when requesting
   * a snapshot identifier that does not exist in preserved order item history.
   *
   * 1. Attempt to read preserved variant options without administrator authentication and expect a denial.
   * 2. Register and authenticate an administrator using an isolated connection.
   * 3. Request a missing order item snapshot UUID and expect a not-found error.
   */
  const missingSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access should be denied",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.index(
        guestConnection,
        {
          orderItemSnapshotId: missingSnapshotId,
          body: {} satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
        },
      );
    },
  );
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "missing snapshot should return not found for administrator",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.index(
        adminConnection,
        {
          orderItemSnapshotId: missingSnapshotId,
          body: {} satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
        },
      );
    },
  );
}
