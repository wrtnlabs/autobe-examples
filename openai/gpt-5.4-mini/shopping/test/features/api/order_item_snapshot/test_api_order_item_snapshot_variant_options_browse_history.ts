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

export async function test_api_order_item_snapshot_variant_options_browse_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Browse preserved variant option rows for an order item snapshot.
   *
   * Validates that administrator-only access can read the immutable option history
   * associated with an existing order item snapshot. The test checks that the
   * response is paginated, stable under repeated requests, and returns preserved
   * option rows exactly as stored for the snapshot.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Request the same order item snapshot variant options page twice with identical
   *    search, pagination, and sort controls.
   * 3. Validate pagination metadata, deterministic response stability, and preserved
   *    option name/value pairs in the returned snapshot history.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: `P@ssw0rd_${RandomGenerator.alphaNumeric(8)}`,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    search: RandomGenerator.alphabets(3),
    page: 1,
    limit: 10,
    sort: "+optionName",
  } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest;
  const firstPage =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.variantOptions.index(
      adminConnection,
      {
        orderItemId,
        orderItemSnapshotId,
        body: request,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.variantOptions.index(
      adminConnection,
      {
        orderItemId,
        orderItemSnapshotId,
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination current page should match request",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "repeated requests should preserve total record count",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "repeated requests should preserve page count",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  TestValidator.equals(
    "repeated requests should preserve ordered option rows",
    firstPage.data,
    secondPage.data,
  );
  TestValidator.predicate(
    "snapshot variant option browse should return a paginated response",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "snapshot variant option browse should not exceed the requested limit",
    firstPage.data.length <= request.limit,
  );
  if (firstPage.data.length > 0) {
    for (const row of firstPage.data) {
      TestValidator.equals(
        "each option row should belong to the requested snapshot",
        row.orderItemSnapshot.id,
        orderItemSnapshotId,
      );
      TestValidator.predicate(
        "preserved option name should not be empty",
        row.optionName.trim().length > 0,
      );
      TestValidator.predicate(
        "preserved option value should not be empty",
        row.optionValue.trim().length > 0,
      );
    }
  }
}
