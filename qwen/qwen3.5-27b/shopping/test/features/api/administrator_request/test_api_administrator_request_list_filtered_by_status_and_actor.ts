import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a super administrator can filter administrator promotion requests by both status and actor type.
 *
 * Validates the filtering functionality of the administrator requests list endpoint. The test verifies that requests can be correctly filtered by status (approved) and actor type (seller), ensuring that only matching requests are returned in the paginated response.
 *
 * Special attention is given to verifying that the filtering logic correctly excludes non-matching requests and that approved requests include the processedByAdministrator information.
 *
 * 1. Register and authenticate as a seller (acting as super administrator for testing).
 * 2. Call the administrator requests list endpoint with status='approved' and actor_type='seller' filters.
 * 3. Validate that all returned requests have status 'approved' and actor_type 'seller'.
 * 4. Verify that approved requests contain processedByAdministrator information.
 * 5. Confirm pagination metadata reflects the filtered results.
 */
export async function test_api_administrator_request_list_filtered_by_status_and_actor(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as seller (acting as super admin)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Call administrator requests list with filters: status='approved', actor_type='seller'
  const response =
    await api.functional.shoppingMall.seller.administrator_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          actor_type: "seller",
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate all returned requests have correct status and actor_type
  await ArrayUtil.asyncForEach(response.data, async (request) => {
    TestValidator.equals(
      "request status is approved",
      request.status,
      "approved",
    );
    TestValidator.equals(
      "request actor_type is seller",
      request.actor_type,
      "seller",
    );
    // 4. Verify approved requests have processedByAdministrator information
    TestValidator.predicate(
      "approved request has processedByAdministrator",
      request.processedByAdministrator !== null,
    );
    if (request.processedByAdministrator !== null) {
      typia.assert(request.processedByAdministrator);
    }
  });
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length matches or is less than limit",
    response.data.length <= response.pagination.limit,
  );
}
