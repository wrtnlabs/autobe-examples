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

export async function test_api_discussion_board_tag_creation_whitespace_trimmed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create tag with leading and trailing whitespace
  const tagNameWithWhitespace = `  ${RandomGenerator.name()}  `;
  const tag = await api.functional.discussionBoard.admin.tags.create(
    adminConnection,
    {
      body: {
        name: tagNameWithWhitespace,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag);
  // 3. Verify the tag name is trimmed
  TestValidator.equals(
    "tag name is trimmed",
    tag.name,
    tagNameWithWhitespace.trim(),
  );
  TestValidator.predicate(
    "tag name does not have leading whitespace",
    !tag.name.startsWith(" "),
  );
  TestValidator.predicate(
    "tag name does not have trailing whitespace",
    !tag.name.endsWith(" "),
  );
}
