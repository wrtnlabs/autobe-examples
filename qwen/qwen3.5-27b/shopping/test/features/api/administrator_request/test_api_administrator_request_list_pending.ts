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
 * Test that a super administrator can view all pending administrator promotion requests.
 *
 * Validates the administrator requests listing functionality with status filtering. Ensures that pending requests are correctly returned with proper structure and null values for processing-related fields.
 *
 * 1. Authenticates as a seller (super administrator)
 * 2. Calls the administrator requests endpoint with status='pending' filter
 * 3. Validates pagination metadata and response structure
 * 4. Verifies all returned requests have pending status and null processing fields
 */
export async function test_api_administrator_request_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for seller (super administrator)
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate as seller (super administrator)
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Call the administrator requests list endpoint with pending status filter
  const response =
    await api.functional.shoppingMall.seller.administrator_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    response.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data array exists", response.data !== undefined);
  // Validate each request in the response
  await ArrayUtil.asyncForEach(response.data, async (request) => {
    // Validate required fields exist
    TestValidator.predicate("id exists", request.id !== undefined);
    TestValidator.predicate(
      "actor_type exists",
      request.actor_type !== undefined,
    );
    TestValidator.predicate("reason exists", request.reason !== undefined);
    TestValidator.predicate("status exists", request.status !== undefined);
    TestValidator.predicate(
      "created_at exists",
      request.created_at !== undefined,
    );
    TestValidator.predicate(
      "updated_at exists",
      request.updated_at !== undefined,
    );
    // Validate status is pending
    TestValidator.equals("status is pending", request.status, "pending");
    // Validate actor_type is valid
    TestValidator.predicate(
      "actor_type is customer or seller",
      request.actor_type === "customer" || request.actor_type === "seller",
    );
    // Validate null fields for pending requests
    TestValidator.equals(
      "rejection_reason is null for pending",
      request.rejection_reason,
      null,
    );
    TestValidator.equals(
      "processedByAdministrator is null for pending",
      request.processedByAdministrator,
      null,
    );
  });
}
