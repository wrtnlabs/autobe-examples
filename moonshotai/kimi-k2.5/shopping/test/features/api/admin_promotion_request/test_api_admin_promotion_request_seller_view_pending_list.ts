import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test the primary success path where an authenticated seller retrieves pending administrator promotion requests.
 * The seller must first authenticate via the join endpoint to obtain valid JWT tokens.
 * Then submit an administrator promotion request to create test data.
 * Finally call the pendingRequests/summary endpoint with default pagination parameters (page: 1, limit: 20).
 */
export async function test_api_admin_promotion_request_seller_view_pending_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller to obtain JWT tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.example.com/join",
      referrer: "https://test.example.com/home",
      ip: null,
    },
  });
  typia.assert(authorizedSeller);
  // 2. Submit an administrator promotion request to create test data
  const promotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // 3. Retrieve pending requests summary with default pagination
  const requestParams: IEcommerceMallAdminPromotionRequest.IRequest = {
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallAdminPromotionRequest.IRequest;
  const response =
    await api.functional.ecommerceMall.seller.pendingRequests.summary.index(
      sellerConnection,
      {
        body: requestParams,
      },
    );
  typia.assert(response);
  // 4. Verify response structure and content
  // Verify pagination metadata is present
  TestValidator.predicate(
    "pagination has valid current page",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Verify the created promotion request appears in the list
  const foundRequest = response.data.find(
    (item) => item.id === promotionRequest.id,
  );
  TestValidator.predicate(
    "created promotion request exists in pending list",
    foundRequest !== undefined,
  );
  // Verify individual request summary structure if data exists
  if (response.data.length > 0) {
    const firstRequest = response.data[0]!;
    TestValidator.equals(
      "request status is pending",
      firstRequest.status,
      "pending",
    );
  }
}
