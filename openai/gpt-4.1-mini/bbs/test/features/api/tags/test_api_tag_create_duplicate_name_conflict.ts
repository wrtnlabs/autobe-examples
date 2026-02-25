import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_tags_create_tag } from "../../../generate/generate_random_discussion_board_administrator_tags_create_tag";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_tag_create_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using the join utility
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // Use admin connection with updated Authorization header
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = admin.token.access;
  // Create an initial random tag
  const firstTag =
    await generate_random_discussion_board_administrator_tags_create_tag(
      adminConnection,
      { body: {} },
    );
  typia.assert(firstTag);
  // Create a tag with the same name to provoke duplicate conflict
  const duplicateBody: IDiscussionBoardArticleTag.ICreate = {
    name: firstTag.name,
  };
  // Expect conflict error when creating tag with duplicate name
  await TestValidator.httpError(
    "duplicate tag name causes conflict",
    409,
    async () => {
      await api.functional.discussionBoard.administrator.tags.createTag(
        adminConnection,
        { body: duplicateBody },
      );
    },
  );
}
