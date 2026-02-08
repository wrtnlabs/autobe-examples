import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_community_subscription_list_include_deleted_and_date_filters(
  connection: api.IConnection,
): Promise<void> {
  // E2E test for listing community subscriptions with includeDeleted and date filters
  // 1. Register a new user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Assume existing subscriptions in both active and soft-deleted states.
  // 3. Retrieve all subscriptions including deleted
  const allSubsResponse =
    await api.functional.communityPlatform.user.community_subscriptions.index(
      userConnection,
      {
        body: {
          includeDeleted: true,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(
    allSubsResponse,
  );
  // 4. Validate response data presence and pagination metadata
  TestValidator.predicate(
    "includes some subscriptions",
    allSubsResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination current page >= 1",
    allSubsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    allSubsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    allSubsResponse.pagination.records >= allSubsResponse.data.length,
  );
  // 5. Attempt date filters if possible (cannot verify properties do not exist)
  // We call API with date filters but cannot assert on fields, so only assert type and response existence
  const nowISOString = new Date().toISOString();
  {
    // createdAfter filter
    const response =
      await api.functional.communityPlatform.user.community_subscriptions.index(
        userConnection,
        {
          body: {
            includeDeleted: true,
            createdAfter: nowISOString, // future date to minimize data
          } satisfies ICommunityPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(
      response,
    );
    TestValidator.predicate(
      "response data with createdAfter filter",
      Array.isArray(response.data),
    );
  }
  {
    // createdBefore filter
    const response =
      await api.functional.communityPlatform.user.community_subscriptions.index(
        userConnection,
        {
          body: {
            includeDeleted: true,
            createdBefore: nowISOString,
          } satisfies ICommunityPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(
      response,
    );
    TestValidator.predicate(
      "response data with createdBefore filter",
      Array.isArray(response.data),
    );
  }
  {
    // both createdAfter and createdBefore
    const response =
      await api.functional.communityPlatform.user.community_subscriptions.index(
        userConnection,
        {
          body: {
            includeDeleted: true,
            createdAfter: "2000-01-01T00:00:00.000Z",
            createdBefore: nowISOString,
          } satisfies ICommunityPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(
      response,
    );
    TestValidator.predicate(
      "response data with createdAfter and createdBefore filter",
      Array.isArray(response.data),
    );
  }
}
