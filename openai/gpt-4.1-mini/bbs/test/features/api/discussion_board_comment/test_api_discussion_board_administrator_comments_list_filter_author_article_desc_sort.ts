import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_administrator_comments_list_filter_author_article_desc_sort(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Verify that an administrator can filter the comments list by author user ID and article ID, and can sort the results by created_at in descending order. Validate that only matching comments are returned with correct pagination metadata. Ensure soft-deleted comments are excluded.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // For the test, since no specific author or article IDs are given, generate some dummy IDs to test filtering.
  // We must prepare a request with filter author_id, article_id, and sort order descending for created_at.
  // Since the schema of IDiscussionBoardComment.IRequest is empty in given DTOs, we will pass an empty filter but rely on the scenario description.
  // To meet the scenario, we simulate a body with sorting info if supported.
  // Since no properties exist on IRequest, we pass an empty object.
  const body: IDiscussionBoardComment.IRequest = {};
  const output =
    await api.functional.discussionBoard.administrator.comments.index(
      adminConnection,
      { body },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page at least 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "the number of data elements does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  // We cannot check created_at or deleted_at because these are not defined in ISummary
  // So we rely on the typia.assert for data validation only
}
