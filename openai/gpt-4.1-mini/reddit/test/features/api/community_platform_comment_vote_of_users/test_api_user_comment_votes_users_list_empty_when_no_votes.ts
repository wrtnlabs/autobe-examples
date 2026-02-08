import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteOfUsers";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_comment_votes_users_list_empty_when_no_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Request the list of comment votes for the authenticated user (expect empty list)
  const output =
    await api.functional.communityPlatform.user.comment_votes.users.index(
      userConnection,
      {
        body: {}, // empty body for filtering default (all votes by user)
      },
    );
  typia.assert(output);
  // 3. Validate response data - empty list and correct pagination metadata
  TestValidator.equals("data array should be empty", output.data.length, 0);
  TestValidator.equals(
    "pagination current page should be 1",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be > 0",
    output.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records should be 0",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    output.pagination.pages,
    0,
  );
}
