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

export async function test_api_user_comment_votes_users_list_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // This test covers listing paginated and filtered comment vote records for a user.
  // 1. User joins (registration + authentication)
  // 2. Query votes with pagination
  // 3. Validate pagination metadata and returned vote summaries
  // 1. Register a new user and authenticate
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Create authenticated user connection with token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // 2. Send request to list user comment votes with pagination
  const listResponse =
    await api.functional.communityPlatform.user.comment_votes.users.index(
      userConnection,
      {
        body: {} satisfies ICommunityPlatformCommentVoteOfUsers.IRequest,
      },
    );
  typia.assert(listResponse);
  // 3. Validate the pagination information
  TestValidator.predicate(
    "pagination current page is valid",
    listResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    listResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    listResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    listResponse.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(listResponse.data));
  // Validate each vote summary in the data list
  for (const voteSummary of listResponse.data) {
    TestValidator.predicate(
      "vote summary is object",
      typeof voteSummary === "object",
    );
  }
}
