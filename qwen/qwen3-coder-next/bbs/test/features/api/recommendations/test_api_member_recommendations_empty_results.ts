import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test empty member recommendations scenario.
 *
 * This test validates that the recommendation system returns proper pagination
 * structure even when a new member has no reading history or interaction data.
 * The system should return an empty data array while maintaining valid pagination
 * metadata (current page, limit, records = 0, pages = 0).
 */
export async function test_api_member_recommendations_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member with no reading history
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.discussionBoard.auth.member.join(memberConnection, {
      body: typia.random<IDiscussionBoardMember.IJoin>(),
    });
  // Update connection with authorization token from join response
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Access recommendations endpoint for new member
  const recommendations: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.member.recommendations.index(
      memberConnection,
    );
  // 3. Validate response structure and pagination
  typia.assert(recommendations);
  // 4. Verify empty data array
  TestValidator.equals(
    "empty recommendations array",
    recommendations.data.length,
    0,
  );
  // 5. Verify pagination structure exists with zero counts
  TestValidator.equals(
    "current page is 1",
    recommendations.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is positive",
    recommendations.pagination.limit > 0,
    true,
  );
  TestValidator.equals("records is 0", recommendations.pagination.records, 0);
  TestValidator.equals(
    "pages is 0 when no records",
    recommendations.pagination.pages,
    0,
  );
}
