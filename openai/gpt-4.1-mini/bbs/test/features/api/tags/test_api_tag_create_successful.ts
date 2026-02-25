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

export async function test_api_tag_create_successful(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario covers the successful creation of a new tag by an authorized administrator.
  // 1. Admin registers and obtains authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  typia.assert(authorized);
  adminConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a new unique tag name
  const tagName = `tag-${RandomGenerator.alphabets(6)}`;
  // 3. Call createTag API to create a new tag with the unique name
  const tag =
    await generate_random_discussion_board_administrator_tags_create_tag(
      adminConnection,
      {
        body: { name: tagName },
      },
    );
  typia.assert(tag);
  // 4. Validate the returned tag object
  TestValidator.equals("tag name matches", tag.name, tagName);
  TestValidator.predicate(
    "tag id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      tag.id,
    ),
  );
  TestValidator.predicate(
    "createdAt is string",
    typeof tag.created_at === "string",
  );
  TestValidator.predicate(
    "updatedAt is string",
    typeof tag.updated_at === "string",
  );
  TestValidator.equals("deletedAt is null", tag.deleted_at, null);
}
