import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_review_listing(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // Call admin review listing endpoint
  const result =
    await api.functional.shoppingMall.admin.admin.reviews.index(
      adminConnection,
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination exists", typeof result.pagination, "object");
  TestValidator.predicate(
    "current page positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate("limit positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", result.pagination.pages >= 0);
  // Validate data array structure
  TestValidator.equals("data array type", Array.isArray(result.data), true);
  TestValidator.predicate(
    "data count matches pagination",
    result.data.length <= result.pagination.limit,
  );
}
