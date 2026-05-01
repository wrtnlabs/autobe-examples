import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_guest_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call guest listing with empty body (default pagination)
  const result = await api.functional.shoppingMall.admin.guests.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  const { pagination, data } = result;
  TestValidator.equals("current page defaults to 1", pagination.current, 1);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  TestValidator.equals(
    "pages equals ceil(records / limit)",
    pagination.pages,
    Math.ceil(pagination.records / pagination.limit),
  );
  TestValidator.predicate(
    "data length does not exceed page limit",
    data.length <= pagination.limit,
  );
  // 4. Validate sort order: created_at descending (newest first)
  if (data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      TestValidator.predicate(
        "records sorted by created_at descending",
        data[i - 1].created_at >= data[i].created_at,
      );
    }
  }
}
