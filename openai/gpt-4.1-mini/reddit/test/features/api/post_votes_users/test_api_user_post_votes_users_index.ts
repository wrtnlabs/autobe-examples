import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUsers";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfUsers";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_post_votes_users_index(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: authorized.token.access };
  // Scenario 1: Retrieve paginated list without filters
  {
    const body: ICommunityPlatformPostVoteOfUsers.IRequest = {};
    const response =
      await api.functional.communityPlatform.user.post_votes.users.index(
        userConnection,
        { body },
      );
    typia.assert(response);
    TestValidator.predicate(
      "pagination exists",
      response.pagination !== null && response.pagination !== undefined,
    );
    TestValidator.predicate("data array exists", Array.isArray(response.data));
    TestValidator.predicate(
      "pagination current page is positive",
      response.pagination.current > 0,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      response.pagination.limit > 0,
    );
  }
  // Scenario 2: Retrieve filtered post votes by vote type - cannot test due to empty schema
  {
    const body: ICommunityPlatformPostVoteOfUsers.IRequest = {};
    const response =
      await api.functional.communityPlatform.user.post_votes.users.index(
        userConnection,
        { body },
      );
    typia.assert(response);
    TestValidator.predicate(
      "pagination exists",
      response.pagination !== null && response.pagination !== undefined,
    );
    TestValidator.predicate("data array exists", Array.isArray(response.data));
  }
  // Scenario 3: Retrieve post votes for user with pagination - cannot test user_id filter due to empty schema
  {
    const body: ICommunityPlatformPostVoteOfUsers.IRequest = {};
    const response =
      await api.functional.communityPlatform.user.post_votes.users.index(
        userConnection,
        { body },
      );
    typia.assert(response);
    TestValidator.predicate(
      "pagination exists",
      response.pagination !== null && response.pagination !== undefined,
    );
    TestValidator.predicate("data array exists", Array.isArray(response.data));
  }
}
