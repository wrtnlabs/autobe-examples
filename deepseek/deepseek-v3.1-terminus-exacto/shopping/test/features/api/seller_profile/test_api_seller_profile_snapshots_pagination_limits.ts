import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
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
  typia.assert(seller);
  // Test with limit = 1 (minimum valid limit)
  const response1 =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.equals(
    "page 1 limit 1 - current page",
    response1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 1 - limit matches",
    response1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "page 1 limit 1 - valid records count",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 limit 1 - valid pages count",
    response1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 limit 1 - data length <= limit",
    response1.data.length <= 1,
  );
  // Test with limit = 10
  const response2 =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals(
    "page 1 limit 10 - current page",
    response2.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 - limit matches",
    response2.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 limit 10 - data length <= limit",
    response2.data.length <= 10,
  );
  // Test with default limit (no limit specified)
  const response3 =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "page 1 default limit - current page",
    response3.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 default limit - has limit",
    response3.pagination.limit > 0,
  );
  TestValidator.predicate(
    "page 1 default limit - data length reasonable",
    response3.data.length <= response3.pagination.limit,
  );
  // Test with maximum limit = 100
  const response4 =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "page 1 limit 100 - current page",
    response4.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 100 - limit matches",
    response4.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "page 1 limit 100 - data length <= limit",
    response4.data.length <= 100,
  );
  // Test pagination metadata consistency
  TestValidator.equals(
    "total records consistent across calls",
    response1.pagination.records,
    response2.pagination.records,
  );
  TestValidator.equals(
    "total records consistent",
    response2.pagination.records,
    response3.pagination.records,
  );
  TestValidator.equals(
    "total records consistent",
    response3.pagination.records,
    response4.pagination.records,
  );
}
