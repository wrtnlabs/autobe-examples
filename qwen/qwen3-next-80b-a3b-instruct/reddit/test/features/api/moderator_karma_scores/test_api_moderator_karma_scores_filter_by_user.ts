import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsKarmaScore";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_karma_scores_filter_by_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Use the moderator's user_id to filter karma scores
  // The moderator user_id will have karma scores from their activities as a moderator
  const targetUserId = moderator.user_id;
  // Step 3: Call the karma_scores endpoint with the user_id filter
  const response =
    await api.functional.communityBbs.moderator.karma_scores.index(
      moderatorConnection,
      {
        body: {
          user_id: targetUserId,
          limit: 10,
        } satisfies ICommunityBbsKarmaScore.IRequest,
      },
    );
  typia.assert(response);
  // Step 4: Validate that the response contains karma scores for the target user
  TestValidator.equals(
    "response contains karma scores for the target user",
    response.data.length > 0,
    true,
  );
  // Step 5: Validate that all karma scores belong to the target user
  for (const record of response.data) {
    TestValidator.equals(
      "karma record actorId matches target user",
      record.actorId,
      targetUserId,
    );
  }
  // Step 6: Validate descending order by lastUpdated
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].lastUpdated);
    const next = new Date(response.data[i + 1].lastUpdated);
    TestValidator.predicate(
      "karma records sorted by lastUpdated descending",
      current >= next,
    );
  }
  // Step 7: Validate pagination metadata is correct
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records matches count",
    response.pagination.records >= response.data.length,
  );
  TestValidator.equals(
    "pagination pages calculation",
    response.pagination.pages,
    Math.ceil(response.pagination.records / 10),
  );
}
