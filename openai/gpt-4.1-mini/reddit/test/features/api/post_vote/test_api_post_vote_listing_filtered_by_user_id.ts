import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUser";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_vote_listing_filtered_by_user_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {},
  });
  // Update userConnection to use authenticated headers
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Prepare filter parameters with the authenticated user's ID
  const filterBody: ICommunityPlatformPostVoteOfUser.IRequest = {
    userId: authorizedUser.id,
    page: 1,
    limit: 10,
  };
  // 3. Retrieve the user's post votes filtered by userId
  const response =
    await api.functional.communityPlatform.user.postVotes.users.index(
      userConnection,
      { body: filterBody },
    );
  // 4. Validate response type
  typia.assert(response);
  // 5. Validate that the pagination info is consistent
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is not negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    response.pagination.pages >= 0,
  );
  // 6. Validate that all votes belong to the authenticated user and voteType is a valid string
  for (const vote of response.data) {
    TestValidator.equals(
      "vote userId matches filter",
      vote.userId,
      authorizedUser.id,
    );
    TestValidator.predicate(
      "voteType is non-empty string",
      typeof vote.voteType === "string" && vote.voteType.length > 0,
    );
  }
}
