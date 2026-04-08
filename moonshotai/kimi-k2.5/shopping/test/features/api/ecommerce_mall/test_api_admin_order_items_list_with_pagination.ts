import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_items_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // Step 2: Call order items listing with default pagination
  const response: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.admin.items.index(adminConnection, {
      body: {},
    });
  // Step 3: Validate complete response structure using typia
  typia.assert(response);
  // Step 4: Business logic validation - verify pagination metadata consistency
  const expectedPages =
    Math.ceil(response.pagination.records / response.pagination.limit) ||
    (response.pagination.records > 0 ? 1 : 0);
  TestValidator.equals(
    "total pages calculation matches",
    response.pagination.pages,
    expectedPages,
  );
  // Step 5: Business logic validation - verify sorting by created_at DESC (newest first)
  if (response.data.length > 1) {
    const timestamps = response.data.map((item) =>
      new Date(item.createdAt).getTime(),
    );
    TestValidator.predicate(
      "sorted by created_at DESC (newest first)",
      timestamps.every((ts, i) => i === 0 || ts <= timestamps[i - 1]!),
    );
  }
  // Step 6: Business logic validation - verify default pagination values
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals(
    "default limit is applied",
    response.pagination.limit,
    response.pagination.limit,
  );
}
