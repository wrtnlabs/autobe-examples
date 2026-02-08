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

export async function test_api_moderator_comment_vote_moderator_index_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a paginated list of all moderator votes on comment votes without any filters, ensuring the system returns votes properly filtered for the authenticated moderator role and includes valid pagination data. Validate pagination metadata correctness, vote record structure, and access control enforcement for moderators.
  // 1. Moderator join to authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {},
    },
  );
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // 2. Fetch moderator comment votes without filters (empty request body)
  const output =
    await api.functional.communityPlatform.moderator.comment_votes.moderators.index(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  const { pagination, data } = output;
  TestValidator.predicate("pagination current >= 1", pagination.current >= 1);
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // pages should be ceiling of records/limit or zero if records is zero
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pagination pages correct",
    pagination.pages,
    expectedPages,
  );
  // 4. Validate each vote record
  for (const vote of data) {
    typia.assert(vote);
  }
}
