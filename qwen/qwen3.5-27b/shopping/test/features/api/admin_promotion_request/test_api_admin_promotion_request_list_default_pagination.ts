import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin promotion request list with default pagination.
 *
 * This test verifies that the administrator promotion requests endpoint returns
 * properly paginated results with correct structure when called with default
 * parameters. It validates pagination metadata, request summaries, and data
 * integrity.
 */
export async function test_api_admin_promotion_request_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Call API with empty body (use defaults: page=1, limit=20)
  const response =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  // 3. Validate complete response structure
  typia.assert(response);
  // 4. Verify pagination defaults
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  // 5. Verify pagination metadata
  TestValidator.predicate(
    "pagination has valid records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    response.pagination.pages >= 0,
  );
  // 6. Verify each request summary has valid status
  response.data.forEach((request) => {
    TestValidator.predicate(
      `request ${request.id} has valid status`,
      ["pending", "approved", "rejected"].includes(request.status),
    );
  });
}
