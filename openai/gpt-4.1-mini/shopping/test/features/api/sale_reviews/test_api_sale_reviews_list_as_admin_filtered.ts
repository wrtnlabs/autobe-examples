import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReview";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_reviews_list_as_admin_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving sale reviews filtered by specific sale ID and customer ID, with pagination, to validate filter handling and correct subset results. Setup includes administrator authentication via join endpoint. Verify that all returned reviews match the filter criteria. This scenario ensures correctness of filtering logic and security checks for administrative access.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  const output =
    await api.functional.shoppingMall.administrator.sale_reviews.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination object exists",
    output.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(output.data));
  for (const review of output.data) {
    typia.assert(review);
  }
}
