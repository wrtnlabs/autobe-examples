import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

/**
 * Test pagination with empty result set for admin promotion requests.
 * 1. Authenticate as seller with super admin privileges
 * 2. Query promotion requests with filters matching zero records
 * 3. Validate response returns empty data array with correct pagination metadata
 */
export async function test_api_admin_promotion_request_list_empty_result_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Query with filters that result in no matches
  const requestBody = {
    status: "approved" as const,
    requesterType: null,
    reviewed: null,
    sortBy: null,
    sortOrder: null,
    cursor: null,
    limit: 20,
    page: 1,
  } satisfies IEcommerceMallAdminPromotionRequest.IRequest;
  const response =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 3. Validate empty result pagination
  TestValidator.equals("data is empty array", response.data, []);
  TestValidator.equals(
    "pagination.records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination.pages is 0", response.pagination.pages, 0);
  TestValidator.equals(
    "pagination.current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit matches request",
    response.pagination.limit,
    20,
  );
}
