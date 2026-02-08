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

export async function test_api_post_vote_filtered_pagination_as_user(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. User joins and authorizes
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  // 2. Query post votes with no filter (get paginated votes)
  const noFilterBody: ICommunityPlatformPostVote.IRequest = {};
  const response = await api.functional.communityPlatform.user.post_votes.index(
    userConnection,
    { body: noFilterBody },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 4. Validate each vote summary in data
  for (const voteSummaryRaw of response.data) {
    const voteSummary =
      typia.assert<ICommunityPlatformPostVote.ISummary>(voteSummaryRaw);
    // Validate that total_upvotes, total_downvotes, and score exist and are numbers
    if (
      typeof (voteSummary as any).total_upvotes === "number" &&
      typeof (voteSummary as any).total_downvotes === "number" &&
      typeof (voteSummary as any).score === "number"
    ) {
      TestValidator.predicate(
        "total_upvotes is non-negative",
        (voteSummary as any).total_upvotes >= 0,
      );
      TestValidator.predicate(
        "total_downvotes is non-negative",
        (voteSummary as any).total_downvotes >= 0,
      );
      // Score can be negative, check it's number
      TestValidator.predicate(
        "score is number",
        typeof (voteSummary as any).score === "number",
      );
    } else {
      // If properties are missing, it means schema is not followed
      throw new Error("Vote summary missing required count fields");
    }
  }
}
