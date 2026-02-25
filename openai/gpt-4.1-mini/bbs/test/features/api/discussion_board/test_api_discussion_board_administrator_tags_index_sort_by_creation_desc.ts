import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_administrator_tags_index_sort_by_creation_desc(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration to obtain access token and authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IDiscussionBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  // Attach access token to adminConnection for authorization header
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Call PATCH /discussionBoard/administrator/tags with sort: "created_at_desc"
  const requestBody: IDiscussionBoardArticleTag.IRequest = {
    sort: "created_at_desc",
  };
  const response =
    await api.functional.discussionBoard.administrator.tags.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 3. Validate pagination metadata correctness
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page should be >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= 1",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    pagination.pages >= 0,
  );
  // 4. Confirm all returned tag summary fields are present and accurate for each tag
  for (const tag of response.data) {
    typia.assert(tag); // Assert structure of tag summary
    TestValidator.predicate(
      "tag createdAt is valid ISO date-time",
      !isNaN(Date.parse(tag.createdAt)),
    );
    TestValidator.predicate("tag id is non-empty string", tag.id.length > 0);
    TestValidator.predicate(
      "tag discussionBoardArticleId is non-empty string",
      tag.discussionBoardArticleId.length > 0,
    );
    TestValidator.predicate(
      "tag discussionBoardTagId is non-empty string",
      tag.discussionBoardTagId.length > 0,
    );
  }
  // 5. Verify the tags are sorted by createdAt descending
  for (let i = 1; i < response.data.length; i++) {
    const prevDate = new Date(response.data[i - 1].createdAt).getTime();
    const currDate = new Date(response.data[i].createdAt).getTime();
    TestValidator.predicate(
      `tags sorted by createdAt desc at index ${i - 1} and ${i}`,
      prevDate >= currDate,
    );
  }
}
