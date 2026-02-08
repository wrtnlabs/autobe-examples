import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostVoteOfUserAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUserAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteOfUserAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfUserAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_post_vote_analytics_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Admin user registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Prepare empty request body for analytics retrieval
  const body: ICommunityPlatformPostVoteOfUserAnalytic.IRequest = {};
  // Retrieve post vote analytics with empty results expected
  const result =
    await api.functional.communityPlatform.admin.analytics.posts.votes.index(
      adminConnection,
      {
        body,
      },
    );
  // Assert the entire response structure and values
  typia.assert(result);
  // Validate that data is empty array
  TestValidator.equals("data is empty", result.data, []);
  // Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 0);
  TestValidator.equals("pagination records", result.pagination.records, 0);
  TestValidator.equals("pagination pages", result.pagination.pages, 0);
}
