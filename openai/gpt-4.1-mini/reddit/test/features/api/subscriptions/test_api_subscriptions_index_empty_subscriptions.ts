import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

export async function test_api_subscriptions_index_empty_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins (registers) and obtains authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(connection, {});
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Query subscriptions without any existing subscriptions
  const requestBody: ICommunityPlatformCommunitySubscription.IRequest = {};
  const response =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      { body: requestBody },
    );
  // 3. Assert structure and types with typia
  typia.assert(response);
  // 4. Validate empty data and correct pagination metadata
  TestValidator.equals("subscriptions data length", response.data.length, 0);
  TestValidator.predicate(
    "pagination current should be >= 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    response.pagination.pages >= 0,
  );
}
