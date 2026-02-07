import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_variant_analytics_full_report(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate admin to access protected analytics endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Retrieve comprehensive variant analytics without filtering
  const analyticsResponse =
    await api.functional.shoppingMall.admin.admin.analytics.variants.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate response structure - must contain pagination and data array
  TestValidator.predicate(
    "response has pagination",
    analyticsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data",
    Array.isArray(analyticsResponse.data),
  );
  TestValidator.predicate(
    "pagination is valid",
    analyticsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    analyticsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    analyticsResponse.pagination.pages >= 0,
  );
  // Verify data array is not empty - since we expect variants with sales/inventory records
  TestValidator.predicate(
    "at least one variant exists",
    analyticsResponse.data.length > 0,
  );
  // Validate each variant summary has expected structure based on IShoppingMallProductVariant.ISummary
  for (const variant of analyticsResponse.data) {
    // For IShoppingMallProductVariant.ISummary (empty object in schema),
    // we can't validate specific properties since no fields are defined
    // but we ensure it's a non-null object
    TestValidator.predicate(
      "variant is object",
      typeof variant === "object" && variant !== null,
    );
  }
}
