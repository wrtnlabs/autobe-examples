import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_paginate_user_list_with_limit_and_page(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin connection for authentication
  const platformAdminConnection: api.IConnection = { host: connection.host };
  // Register platform admin
  const platformAdmin = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      },
    },
  );
  // Use authenticated connection
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = platformAdminConnection.headers;
  // Request page 2 with limit 10 (we expect empty results, but need to validate pagination structure)
  const page2Body: IRedditCommunityMember.IRequest = {
    page: 2,
    limit: 10,
  };
  const result = await api.functional.redditCommunity.platformAdmin.users.index(
    authenticatedConnection,
    {
      body: page2Body,
    },
  );
  typia.assert(result);
  // Validate pagination metadata for empty result set
  TestValidator.equals("current page is 2", result.pagination.current, 2);
  TestValidator.equals("limit is 10", result.pagination.limit, 10);
  TestValidator.equals("records count is 0", result.pagination.records, 0);
  TestValidator.equals("pages count is 0", result.pagination.pages, 0);
  // Validate empty result set (data should be empty array)
  TestValidator.equals("no users returned", result.data.length, 0);
  // Test page 1 with same limit to validate consistency
  const page1Body: IRedditCommunityMember.IRequest = {
    page: 1,
    limit: 10,
  };
  const resultPage1 =
    await api.functional.redditCommunity.platformAdmin.users.index(
      authenticatedConnection,
      {
        body: page1Body,
      },
    );
  typia.assert(resultPage1);
  // Validate pagination metadata for page 1
  TestValidator.equals("current page is 1", resultPage1.pagination.current, 1);
  TestValidator.equals("limit is 10", resultPage1.pagination.limit, 10);
  TestValidator.equals(
    "pages count for page1 is 0",
    resultPage1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "records count for page1 is 0",
    resultPage1.pagination.records,
    0,
  );
  // Validate empty result set on page 1
  TestValidator.equals(
    "no users returned on page 1",
    resultPage1.data.length,
    0,
  );
}
