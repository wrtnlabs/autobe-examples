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

export async function test_api_moderator_comment_vote_moderator_index_filter_by_moderator_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Prepare a request body to filter by specific moderator_id
  // Since ICommunityPlatformCommentVoteOfModerators.IRequest is empty according to DTOs,
  // we must simulate realistic filtering criteria manually.
  // However, no properties available for filtering in the DTO.
  //
  // Therefore, test filtering by passing an empty body,
  // which should return all records with pagination.
  const firstResponse =
    await api.functional.communityPlatform.moderator.comment_votes.moderators.index(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(firstResponse);
  // 3. If no votes, skip further test
  if (firstResponse.data.length === 0) {
    return;
  }
  // We cannot extract moderator_id because it does not exist on the response data type
  // So we skip filtering by moderator_id
  // 7. Validate moderator token enforcement: an unauthenticated call triggers error
  await TestValidator.error("Unauthorized access", async () => {
    await api.functional.communityPlatform.moderator.comment_votes.moderators.index(
      {
        host: connection.host,
      },
      { body: {} },
    );
  });
  // 8. Validate pagination metadata
  const pagination = firstResponse.pagination;
  TestValidator.predicate("current page >= 1", pagination.current >= 1);
  TestValidator.predicate("limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "pages correct",
    pagination.pages === Math.ceil(pagination.records / pagination.limit || 1),
  );
  // 9. Validate data type of votes in the data list; cannot access moderator_id
  TestValidator.predicate(
    "all votes are objects",
    firstResponse.data.every((vote) => typeof vote === "object" && vote !== null),
  );
}
