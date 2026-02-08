import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerators";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteOfModerators";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comment_vote_moderator_index_filter_by_comment_vote_id_and_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and authenticates
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {}, // ICommunityPlatformModerator.IJoin has no properties
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Call index API with empty filter because schema does not allow filters
  const response =
    await api.functional.communityPlatform.moderator.comment_votes.moderators.index(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate pagination properties present and data array present
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(response.data),
  );
}
