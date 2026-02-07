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

export async function test_api_member_recommendations_pagination(
  connection: api.IConnection,
) {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Test pagination with specific parameters
  const page1 =
    await api.functional.discussionBoard.member.recommendations.index(
      memberConnection,
    );
  typia.assert(page1);
  // Verify pagination structure exists
  TestValidator.predicate(
    "has pagination metadata",
    page1.pagination !== undefined,
  );
  TestValidator.predicate("has data array", page1.data !== undefined);
  // Validate pagination fields match expected types
  TestValidator.predicate(
    "current page is positive integer",
    page1.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is positive integer",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    page1.pagination.pages >= 0,
  );
  // Verify data array length matches limit or is smaller on last page
  TestValidator.predicate(
    "data length does not exceed limit",
    page1.data.length <= page1.pagination.limit,
  );
  // If there are records, verify they have expected structure
  if (page1.data.length > 0) {
    TestValidator.equals(
      "data count matches pagination",
      page1.data.length,
      Math.min(page1.pagination.limit, page1.pagination.records),
    );
  }
}
