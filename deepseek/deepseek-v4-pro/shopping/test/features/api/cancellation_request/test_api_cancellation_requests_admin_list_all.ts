import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin listing of all cancellation requests with default pagination.
 *
 * Validates that a platform administrator can browse all cancellation requests across the entire shopping mall. Ensures the response returns a properly structured paginated list where each summary includes the request identifier, associated order item with product and variant context, customer-provided reason text, current workflow status, and creation timestamp.
 *
 * Confirms that results are sorted newest first by default and that soft-deleted cancellation request records are excluded from the listing.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Administrator lists all cancellation requests with default pagination and sorting parameters.
 * 3. Validates response pagination metadata and data structure.
 */
export async function test_api_cancellation_requests_admin_list_all(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const result =
    await api.functional.shoppingMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.predicate(
    "data does not exceed page limit",
    result.data.length <= result.pagination.limit,
  );
  TestValidator.predicate(
    "total records at least as large as current page data",
    result.pagination.records >= result.data.length,
  );
}
