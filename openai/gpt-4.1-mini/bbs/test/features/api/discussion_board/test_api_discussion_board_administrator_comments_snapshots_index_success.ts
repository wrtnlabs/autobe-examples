import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_administrator_comments_snapshots_index_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of comment snapshots by an administrator.
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const requestBody1: IDiscussionBoardCommentSnapshot.IRequest = {};
  const response1 =
    await api.functional.discussionBoard.administrator.comments.snapshots.index(
      adminConnection,
      { commentId, body: requestBody1 },
    );
  typia.assert(response1);
  // Validate pagination structure
  TestValidator.predicate(
    "Scenario 1: pagination object exists",
    response1.pagination !== undefined && response1.pagination !== null,
  );
  TestValidator.predicate(
    "Scenario 1: pagination current page is positive number",
    response1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "Scenario 1: records count is non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Scenario 1: pages count is non-negative",
    response1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Scenario 1: data is array",
    Array.isArray(response1.data),
  );
  // Scenario 2: Retrieval of comment snapshots filtered by creation time range and content search.
  const createdAfter = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const createdBefore = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const searchKeyword = "test";
  const requestBody2 = {
    createdAfter,
    createdBefore,
    query: searchKeyword,
  } satisfies IDiscussionBoardCommentSnapshot.IRequest;
  const response2 =
    await api.functional.discussionBoard.administrator.comments.snapshots.index(
      adminConnection,
      { commentId, body: requestBody2 },
    );
  typia.assert(response2);
  // Only validate pagination and data structure, no properties on snapshots exist
  TestValidator.predicate(
    "Scenario 2: pagination object exists",
    response2.pagination !== undefined && response2.pagination !== null,
  );
  TestValidator.predicate(
    "Scenario 2: pagination current page is positive number",
    response2.pagination.current >= 0,
  );
  TestValidator.predicate(
    "Scenario 2: records count is non-negative",
    response2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Scenario 2: pages count is non-negative",
    response2.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Scenario 2: data is array",
    Array.isArray(response2.data),
  );
  // Scenario 3: Unauthorized access attempt by non-administrator role.
  const nonAdminConnection: api.IConnection = { host: connection.host };
  const anonCommentId = typia.random<string & tags.Format<"uuid">>();
  const requestBody3: IDiscussionBoardCommentSnapshot.IRequest = {};
  await TestValidator.error(
    "Scenario 3: unauthorized access should throw",
    async () => {
      await api.functional.discussionBoard.administrator.comments.snapshots.index(
        nonAdminConnection,
        { commentId: anonCommentId, body: requestBody3 },
      );
    },
  );
}
