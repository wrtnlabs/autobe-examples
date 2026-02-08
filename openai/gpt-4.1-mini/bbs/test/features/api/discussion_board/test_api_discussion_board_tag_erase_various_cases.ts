import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_discussion_board_tag_erase_various_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an existing tag
  // Scenario 2: Attempt to delete a tag that does not exist
  // Scenario 3: Deletion of a tag that is currently associated with articles
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Scenario 1
  // Create a new tag with a unique name
  const createBody1: IDiscussionBoardTag.ICreate = {
    name: RandomGenerator.name(),
  } satisfies IDiscussionBoardTag.ICreate;
  const createdTag1Raw = await generate_random_discussion_board_tags_create(
    adminConnection,
    { body: createBody1 },
  );
  // The created tag should have 'id', so assert and extract
  const createdTag1 = typia.assert<{ id: string } & Partial<IDiscussionBoardTag>>(createdTag1Raw);
  // Delete the newly created tag
  await api.functional.discussionBoard.tags.erase(adminConnection, {
    tagId: createdTag1.id,
  });
  // 3. Scenario 2
  // Attempt to delete a non-existent tag with a random UUID
  const fakeTagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "delete non-existent tag returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.tags.erase(adminConnection, {
        tagId: fakeTagId,
      });
    },
  );
  // 4. Scenario 3
  // Create a new tag with unique name
  const createBody2: IDiscussionBoardTag.ICreate = {
    name: RandomGenerator.name(),
  } satisfies IDiscussionBoardTag.ICreate;
  const createdTag2Raw = await generate_random_discussion_board_tags_create(
    adminConnection,
    { body: createBody2 },
  );
  const createdTag2 = typia.assert<{ id: string } & Partial<IDiscussionBoardTag>>(createdTag2Raw);
  // Delete the tag that might be associated with articles
  await api.functional.discussionBoard.tags.erase(adminConnection, {
    tagId: createdTag2.id,
  });
}
