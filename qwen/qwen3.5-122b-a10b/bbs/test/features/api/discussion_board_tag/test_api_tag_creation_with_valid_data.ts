import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_tags_create } from "../../../generate/generate_random_discussion_board_admin_tags_create";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_tag_creation_with_valid_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create tag with whitespace in name to test trimming
  const tagName = `  ${RandomGenerator.name()}  `;
  const tagDescription = RandomGenerator.paragraph({ sentences: 3 });
  const tag = await api.functional.discussionBoard.admin.tags.create(
    adminConnection,
    {
      body: {
        name: tagName,
        description: tagDescription,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag);
  // 3. Verify name is trimmed (business logic validation)
  TestValidator.equals("tag name is trimmed", tag.name, tagName.trim());
  TestValidator.predicate("no leading whitespace", tag.name[0] !== " ");
  TestValidator.predicate(
    "no trailing whitespace",
    tag.name[tag.name.length - 1] !== " ",
  );
  // 4. Verify description matches input
  TestValidator.equals(
    "description matches input",
    tag.description,
    tagDescription,
  );
  // 5. Verify timestamps are set (not null/undefined)
  TestValidator.predicate("created_at is set", tag.created_at.length > 0);
  TestValidator.predicate("updated_at is set", tag.updated_at.length > 0);
  // 6. Verify deleted_at is null for active tag
  TestValidator.equals(
    "deleted_at is null for active tag",
    tag.deleted_at,
    null,
  );
  // 7. Verify id is a non-empty UUID string
  TestValidator.predicate("id is non-empty", tag.id.length > 0);
}
