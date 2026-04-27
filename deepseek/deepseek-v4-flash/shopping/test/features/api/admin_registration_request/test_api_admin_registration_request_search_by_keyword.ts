import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdminRegistrationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_registration_request_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Authenticate as seller
  //----
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  //----
  // 2. Search with keyword expected to match
  //----
  const keyword = "admin";
  const resultWithKeyword =
    await api.functional.eCommerceMall.seller.admin_registration_requests.index(
      sellerConnection,
      {
        body: {
          search: keyword,
        },
      },
    );
  typia.assert(resultWithKeyword);
  for (const req of resultWithKeyword.data) {
    TestValidator.predicate(
      `reason contains keyword "${keyword}"`,
      req.reason.toLowerCase().includes(keyword),
    );
  }
  //----
  // 3. Search with non-matching keyword
  //----
  const noMatchKeyword = "zzzznotfound";
  const resultNoMatch =
    await api.functional.eCommerceMall.seller.admin_registration_requests.index(
      sellerConnection,
      {
        body: {
          search: noMatchKeyword,
        },
      },
    );
  typia.assert(resultNoMatch);
  TestValidator.equals(
    "empty data with non-matching keyword",
    resultNoMatch.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination current is 1",
    resultNoMatch.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination records is 0",
    resultNoMatch.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages is 0",
    resultNoMatch.pagination.pages === 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    resultNoMatch.pagination.limit > 0,
  );
  //----
  // 4. Filter by date range
  //----
  const currentDate = new Date();
  const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const resultByDateRange =
    await api.functional.eCommerceMall.seller.admin_registration_requests.index(
      sellerConnection,
      {
        body: {
          from: oneWeekAgo.toISOString(),
          to: currentDate.toISOString(),
        },
      },
    );
  typia.assert(resultByDateRange);
  const fromTime = oneWeekAgo.getTime();
  const toTime = currentDate.getTime();
  for (const req of resultByDateRange.data) {
    const createdAt = new Date(req.created_at).getTime();
    TestValidator.predicate(
      `created_at within range`,
      createdAt >= fromTime && createdAt <= toTime,
    );
  }
  //----
  // 5. Combine keyword + date range
  //----
  const resultCombined =
    await api.functional.eCommerceMall.seller.admin_registration_requests.index(
      sellerConnection,
      {
        body: {
          search: keyword,
          from: oneWeekAgo.toISOString(),
          to: currentDate.toISOString(),
        },
      },
    );
  typia.assert(resultCombined);
  for (const req of resultCombined.data) {
    TestValidator.predicate(
      `reason contains keyword "${keyword}"`,
      req.reason.toLowerCase().includes(keyword),
    );
    const createdAt = new Date(req.created_at).getTime();
    TestValidator.predicate(
      `created_at within range`,
      createdAt >= fromTime && createdAt <= toTime,
    );
  }
}
