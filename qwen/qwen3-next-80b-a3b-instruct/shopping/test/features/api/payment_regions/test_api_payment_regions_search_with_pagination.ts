import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentRegion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_regions_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Define pagination parameters for request
  const paginationParams: IShoppingMallPaymentRegion.IRequest = {
    page: 2,
    limit: 50,
  };
  // Call the payment regions search endpoint with pagination parameters
  const result: IPageIShoppingMallPaymentRegion.ISummary =
    await api.functional.shoppingMall.admin.payment_regions.index(
      adminConnection,
      {
        body: paginationParams,
      },
    );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 2",
    result.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 50", result.pagination.limit, 50);
  TestValidator.predicate(
    "total records should be greater than 0",
    result.pagination.records > 0,
  );
  TestValidator.equals(
    "total pages should be at least 1",
    result.pagination.pages,
    Math.ceil(result.pagination.records / 50),
  );
  // Validate that the number of returned records matches the limit
  TestValidator.equals(
    "number of returned records should equal limit",
    result.data.length,
    50,
  );
}
