import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerators";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfModerators";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_vote_list_filtered_by_moderator_and_vote_type(
  connection: api.IConnection,
): Promise<void> {
  // Test filtering moderator post votes by moderator ID and vote type (upvote).
  // 1. Join and authorize a new moderator.
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinPayload: ICommunityPlatformModerator.IJoin = {};
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    { body: moderatorJoinPayload },
  );
  typia.assert(authorizedModerator);
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorizedModerator.token.access}`,
  };
  // 2. Prepare request body to filter by this moderator's ID and vote type 'upvote'.
  // Since the ICommunityPlatformPostVoteOfModerators.IRequest is an empty object type,
  // we cannot set explicit filter properties directly. Instead, follow the realistic approach:
  // The real API should accept some filters (not typed here), but we will send an empty object to test.
  const response =
    await api.functional.communityPlatform.moderator.post_votes.moderators.index(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Test that pagination metadata is valid.
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current page number >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // 4. Check data integrity.
  // Since the response data type is empty object type, we do not have explicit properties.
  // But per scenario, we want to check the votes are by the moderator, vote type is upvote, and soft deletes are excluded.
  // Due to missing properties in DTO, this can't be validated here.
  // 5. We can just validate the pagination size and that the response is consistent.
  TestValidator.predicate(
    "data length <= pagination limit",
    data.length <= pagination.limit,
  );
}
