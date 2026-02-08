import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_article_tag_mappings_update_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Administrator updates article tag mappings successfully with various edge cases
  // Steps:
  // 1. Administrator authentication via /auth/administrator/join
  // 2. Assume existence of article and tags (simulate or generate UUIDs for test)
  // 3. Update tag mappings with new tag ID list
  // 4. Verify update result correctness
  // 5. Repeat update with same tags to check idempotency
  // 6. Update with empty tag list to test removal of all tags
  // 7. Test unauthorized update attempts
  // 1. Administrator authentication
  const adminAuth = await authorize_administrator_join(
    { host: connection.host },
    { body: {} },
  );
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuth.token.access}` },
  };
  // Simulate articleId and tagIds for testing
  // Since no article creation or tag creation API provided, use UUIDs
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Generate initial tags
  const initialTagUUIDs: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
    3,
    () => typia.random<string & tags.Format<"uuid">>(),
  );
  // 3. Update tag mappings: set initial tags
  let response =
    await api.functional.discussionBoard.administrator.articles.tag_mappings.updateTagMappings(
      adminConnection,
      {
        articleId,
        body: initialTagUUIDs,
      },
    );
  typia.assert(response);
  // Validate that response data matches the initialTagUUIDs
  // response.data is string[] instead of array of objects with id
  const returnedTagUUIDs = (response.data as (string & tags.Format<"uuid">)[]).slice().sort();
  const sortedInitialTagUUIDs = [...initialTagUUIDs].sort();
  TestValidator.equals(
    "initial tags updated correctly",
    returnedTagUUIDs,
    sortedInitialTagUUIDs,
  );
  // 4. Update with a new set of tags (remove some, add others)
  const newTagUUIDs: (string & tags.Format<"uuid">)[] = [
    initialTagUUIDs[1], // keep one existing
    typia.random<string & tags.Format<"uuid">>(), // new tag
    typia.random<string & tags.Format<"uuid">>(), // new tag
  ];
  response =
    await api.functional.discussionBoard.administrator.articles.tag_mappings.updateTagMappings(
      adminConnection,
      {
        articleId,
        body: newTagUUIDs,
      },
    );
  typia.assert(response);
  // response.data is string[]
  const returnedNewTagUUIDs = (response.data as (string & tags.Format<"uuid">)[]).slice().sort();
  const sortedNewTagUUIDs = [...newTagUUIDs].sort();
  TestValidator.equals(
    "tags updated with additions and removals",
    returnedNewTagUUIDs,
    sortedNewTagUUIDs,
  );
  // 5. Repeat update with the same tags to test idempotency
  const responseRepeat =
    await api.functional.discussionBoard.administrator.articles.tag_mappings.updateTagMappings(
      adminConnection,
      {
        articleId,
        body: newTagUUIDs,
      },
    );
  typia.assert(responseRepeat);
  TestValidator.equals(
    "idempotent update returns same tags",
    (responseRepeat.data as (string & tags.Format<"uuid">)[]).slice().sort(),
    sortedNewTagUUIDs,
  );
  // 6. Update with empty tag list to remove all tags
  const responseEmpty =
    await api.functional.discussionBoard.administrator.articles.tag_mappings.updateTagMappings(
      adminConnection,
      {
        articleId,
        body: [],
      },
    );
  typia.assert(responseEmpty);
  TestValidator.equals(
    "empty tag list removes all tag mappings",
    responseEmpty.data.length,
    0,
  );
  // 7. Unauthorized update attempt: use a connection with no admin authorization
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update forbidden",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.articles.tag_mappings.updateTagMappings(
        noAuthConnection,
        {
          articleId,
          body: [typia.random<string & tags.Format<"uuid">>()],
        },
      );
    },
  );
}
