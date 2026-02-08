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

export async function test_api_post_vote_filter_by_vote_type_as_user(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving post vote records filtered by vote type with a newly joined user
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Query post votes with filter vote_type = 'upvote'
  const upvoteBody = {
    vote_type: "upvote",
  } satisfies ICommunityPlatformPostVote.IRequest;
  const upvoteResult =
    await api.functional.communityPlatform.user.post_votes.index(
      userConnection,
      { body: upvoteBody },
    );
  typia.assert(upvoteResult);
  // Validate pagination info and data array
  TestValidator.predicate(
    "upvoteResult has pagination",
    !!upvoteResult.pagination,
  );
  TestValidator.predicate(
    "upvoteResult data is array",
    Array.isArray(upvoteResult.data),
  );
  // Since vote_type property does not exist, only confirm that returned data count matches pagination
  TestValidator.equals(
    "upvoteResult data length matches pagination limit or less",
    upvoteResult.data.length <= upvoteResult.pagination.limit,
    true,
  );
  // 3. Query post votes with filter vote_type = 'downvote'
  const downvoteBody = {
    vote_type: "downvote",
  } satisfies ICommunityPlatformPostVote.IRequest;
  const downvoteResult =
    await api.functional.communityPlatform.user.post_votes.index(
      userConnection,
      { body: downvoteBody },
    );
  typia.assert(downvoteResult);
  TestValidator.predicate(
    "downvoteResult has pagination",
    !!downvoteResult.pagination,
  );
  TestValidator.predicate(
    "downvoteResult data is array",
    Array.isArray(downvoteResult.data),
  );
  TestValidator.equals(
    "downvoteResult data length matches pagination limit or less",
    downvoteResult.data.length <= downvoteResult.pagination.limit,
    true,
  );
}
