import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemConfiguration";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";

export async function test_api_reddit_community_system_configuration_search_with_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) to authenticate and obtain token
  const adminJoinBody = {
    email: RandomGenerator.alphaNumeric(6) + "@redditadmin.com",
    password: "admin1234",
    href: "https://redditcommunity.admin/join",
    referrer: "https://redditcommunity.admin",
  } satisfies IRedditCommunityAdmin.IJoin;

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin searches system configurations with pagination and filtering by key name
  const page = 1;
  const limit = 5;
  const searchKey = "config";

  const requestBody = {
    page: page satisfies number as number,
    limit: limit satisfies number as number,
    search: searchKey,
  } satisfies IRedditCommunitySystemConfiguration.IRequest;

  const response: IPageIRedditCommunitySystemConfiguration.ISummary =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);

  // 3. Validate pagination info
  TestValidator.predicate(
    "pagination current page is correct",
    response.pagination.current === page,
  );

  TestValidator.predicate(
    "pagination limit is correct",
    response.pagination.limit === limit,
  );

  TestValidator.predicate(
    "pagination records count non-negative",
    response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages count matches records and limit",
    response.pagination.pages >= 0 &&
      response.pagination.pages >=
        Math.ceil(response.pagination.records / limit),
  );

  // 4. Validate each configuration summary matches search criteria
  for (const conf of response.data) {
    typia.assert(conf);
    TestValidator.predicate(
      "configuration name contains search key",
      conf.name.includes(searchKey),
    );
  }
}
