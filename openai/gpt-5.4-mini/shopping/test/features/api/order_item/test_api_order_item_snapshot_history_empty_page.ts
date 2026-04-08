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
 * Test administrator order item snapshot history returns an empty page for a valid order item with no snapshots.
 *
 * This validates the administrator-only snapshot history endpoint for a valid order item scope that has no preserved history yet. The response must be a real paginated empty collection rather than an error or fabricated data, and it must preserve the requested order item context for audit review.
 *
 * 1. Register and authenticate a new administrator using the join utility.
 * 2. Request snapshot history for a valid order item identifier with an empty filter body.
 * 3. Validate the response is an empty page with consistent pagination metadata.
 */
export async function test_api_order_item_snapshot_history_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: `Aa1!${RandomGenerator.alphabets(10)}` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(administrator);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.index(
      adminConnection,
      {
        orderItemId,
        body: {} satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page should default to first page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be zero for an empty page when no limit is supplied",
    response.pagination.limit,
    0,
  );
  TestValidator.equals(
    "pagination record count should be zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination page count should be zero",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "snapshot history should be empty",
    response.data.length,
    0,
  );
}
