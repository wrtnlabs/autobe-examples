import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_empty_search(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // Search cancellation requests with criteria that guarantee no results
  const searchCriteria = {
    customer_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent customer ID
    date_from: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(), // Far future date
    status: "non_existent_status" as const, // Invalid status
    search: "guaranteed_non_matching_search_term", // Search term that won't match
    page: 1,
    limit: 10,
  } satisfies IEcommerceCancellationRequest.IRequest;
  const result =
    await api.functional.ecommerce.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: searchCriteria,
      },
    );
  typia.assert(result);
  // Validate empty results with proper pagination metadata
  TestValidator.equals("should return empty data array", result.data.length, 0);
  TestValidator.equals(
    "current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals("total pages should be 0", result.pagination.pages, 0);
}
