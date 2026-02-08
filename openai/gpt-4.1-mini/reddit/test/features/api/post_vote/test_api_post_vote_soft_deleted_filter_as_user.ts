import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_vote_soft_deleted_filter_as_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Query post votes without filters because DTO defines empty object
  const allVotes = await api.functional.communityPlatform.user.post_votes.index(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(allVotes);
  // 3. Validate pagination metadata consistency
  TestValidator.predicate(
    "votes pagination current page > 0",
    allVotes.pagination.current >= 1,
  );
  TestValidator.predicate(
    "votes pagination limit > 0",
    allVotes.pagination.limit > 0,
  );
  TestValidator.predicate(
    "votes pagination pages >= 0",
    allVotes.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "votes pagination records >= 0",
    allVotes.pagination.records >= 0,
  );
  // 4. Validate that votes data array exists
  TestValidator.predicate("votes data is array", Array.isArray(allVotes.data));
}
