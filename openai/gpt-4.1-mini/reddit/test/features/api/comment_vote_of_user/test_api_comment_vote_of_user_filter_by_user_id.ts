import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUser";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteOfUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_comment_vote_of_user_filter_by_user_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and get authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  // Replace userConnection headers with bearer token string
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Prepare request body to filter votes by the new user ID with pagination
  const requestBody: ICommunityPlatformCommentVoteOfUser.IRequest = {
    userId: authorizedUser.id,
    page: 1,
    limit: 10,
  };
  // 3. Fetch paginated votes by user ID
  const response =
    await api.functional.communityPlatform.user.commentVotes.users.index(
      userConnection,
      {
        body: requestBody,
      },
    );
  // 4. Validate response type
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 6. Validate each vote data
  for (const vote of response.data) {
    typia.assert(vote);
    TestValidator.equals(
      "vote matches userId",
      vote.communityPlatformUserId,
      authorizedUser.id,
    );
    TestValidator.predicate(
      "vote type is a non-empty string",
      typeof vote.voteType === "string" && vote.voteType.length > 0,
    );
    TestValidator.predicate(
      "createdAt is valid ISO datetime string",
      !isNaN(Date.parse(vote.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is valid ISO datetime string",
      !isNaN(Date.parse(vote.updatedAt)),
    );
    if (vote.deletedAt !== null) {
      TestValidator.predicate(
        "deletedAt is valid ISO datetime string when not null",
        !isNaN(Date.parse(vote.deletedAt)),
      );
    }
  }
}
