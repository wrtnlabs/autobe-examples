import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_article_tag_retrieve_by_valid_id_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve an article tag by valid UUID and test 404 for non-existent UUID
  // Use base connection as the endpoint does not require authorization
  // Obtain a valid tag to test
  const validTag = typia.random<IDiscussionBoardTag>();
  typia.assert(validTag);
  // Retrieve detail of valid tag ID
  const tag = await api.functional.discussionBoard.administrator.tags.at(
    connection,
    {
      tagId: validTag.id,
    },
  );
  typia.assert(tag);
  // Validate properties
  typia.assert(tag.id);
  typia.assert(tag.name);
  typia.assert(tag.created_at);
  typia.assert(tag.updated_at);
  // deleted_at can be null or string
  if (tag.deleted_at !== null) typia.assert(tag.deleted_at);
  // Test retrieval of non-existent tag ID should return 404
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieving non-existent tag should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.tags.at(connection, {
        tagId: nonExistentTagId,
      });
    },
  );
}
