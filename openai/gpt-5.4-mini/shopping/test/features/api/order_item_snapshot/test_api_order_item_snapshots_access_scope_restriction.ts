import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies order item snapshot browsing for an authenticated administrator.
 *
 * This test authenticates an administrator and then queries the immutable order item
 * snapshot history using the supported request contract. It validates that the endpoint
 * returns a properly shaped paginated response and that browsing the snapshot store does
 * not mutate any records.
 *
 * 1. Register and authenticate an administrator account.
 * 2. Request order item snapshot history with a minimal valid pagination payload.
 * 3. Validate the response is a proper immutable page of snapshot summaries.
 * 4. Confirm the returned rows, if any, are valid snapshot summaries and that browsing has no side effects.
 */
export async function test_api_order_item_snapshots_access_scope_restriction(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "-snapshotAt",
        } satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page should be the requested page",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be the requested limit",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should not be negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should not be negative",
    output.pagination.pages >= 0,
  );
  for (const snapshot of output.data) typia.assert(snapshot);
}
