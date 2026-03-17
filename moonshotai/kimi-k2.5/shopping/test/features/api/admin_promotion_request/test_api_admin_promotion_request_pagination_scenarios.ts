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

export async function test_api_admin_promotion_request_pagination_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create 27 admin promotion requests to test pagination
  const requestCount = 27;
  await ArrayUtil.asyncRepeat(requestCount, async () => {
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  });
  // 3. Test page 1 with limit 10 (default page size)
  const page1Limit10 =
    await api.functional.ecommerceMall.seller.pendingRequests.summary.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(page1Limit10);
  // Validate pagination metadata for page 1, limit 10
  TestValidator.equals(
    "page 1 limit 10 - current page",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 - limit",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 limit 10 - total records",
    page1Limit10.pagination.records,
    requestCount,
  );
  TestValidator.equals(
    "page 1 limit 10 - total pages",
    page1Limit10.pagination.pages,
    Math.ceil(requestCount / 10),
  );
  TestValidator.equals(
    "page 1 limit 10 - data length",
    page1Limit10.data.length,
    10,
  );
  // 4. Test page 2 with limit 10 (pagination navigation)
  const page2Limit10 =
    await api.functional.ecommerceMall.seller.pendingRequests.summary.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(page2Limit10);
  // Validate pagination metadata for page 2, limit 10
  TestValidator.equals(
    "page 2 limit 10 - current page",
    page2Limit10.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 10 - limit",
    page2Limit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 limit 10 - total records",
    page2Limit10.pagination.records,
    requestCount,
  );
  TestValidator.equals(
    "page 2 limit 10 - total pages",
    page2Limit10.pagination.pages,
    Math.ceil(requestCount / 10),
  );
  TestValidator.equals(
    "page 2 limit 10 - data length",
    page2Limit10.data.length,
    10,
  );
  // 5. Test page 1 with limit 50 (larger page size)
  const page1Limit50 =
    await api.functional.ecommerceMall.seller.pendingRequests.summary.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(page1Limit50);
  // Validate pagination metadata for page 1, limit 50
  TestValidator.equals(
    "page 1 limit 50 - current page",
    page1Limit50.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 50 - limit",
    page1Limit50.pagination.limit,
    50,
  );
  TestValidator.equals(
    "page 1 limit 50 - total records",
    page1Limit50.pagination.records,
    requestCount,
  );
  TestValidator.equals(
    "page 1 limit 50 - total pages",
    page1Limit50.pagination.pages,
    1,
  );
  TestValidator.equals(
    "page 1 limit 50 - data length",
    page1Limit50.data.length,
    requestCount,
  );
  // 6. Test edge case: page beyond available data
  const pageBeyond =
    await api.functional.ecommerceMall.seller.pendingRequests.summary.index(
      sellerConnection,
      {
        body: {
          page: 100,
          limit: 10,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pageBeyond);
  // Validate pagination metadata for page beyond available data
  TestValidator.equals(
    "page beyond - current page",
    pageBeyond.pagination.current,
    100,
  );
  TestValidator.equals("page beyond - limit", pageBeyond.pagination.limit, 10);
  TestValidator.equals(
    "page beyond - total records",
    pageBeyond.pagination.records,
    requestCount,
  );
  TestValidator.equals(
    "page beyond - total pages",
    pageBeyond.pagination.pages,
    Math.ceil(requestCount / 10),
  );
  TestValidator.equals("page beyond - data length", pageBeyond.data.length, 0);
}
