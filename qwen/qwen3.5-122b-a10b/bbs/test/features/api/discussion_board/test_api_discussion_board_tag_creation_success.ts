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

export async function test_api_discussion_board_tag_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create tag with whitespace in name to verify trimming
  const tagNameWithWhitespace = `  ${RandomGenerator.name()}  `;
  const tag = await generate_random_discussion_board_admin_tags_create(
    adminConnection,
    {
      body: {
        name: tagNameWithWhitespace,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag);
  // 3. Validate response structure
  TestValidator.equals(
    "tag has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tag.id,
    ),
    true,
  );
  TestValidator.equals(
    "tag name is trimmed",
    tag.name,
    tagNameWithWhitespace.trim(),
  );
  TestValidator.equals("article count is initially 0", tag.article_count, 0);
  TestValidator.equals("deleted_at is null", tag.deleted_at, null);
  // 4. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(tag.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(tag.updated_at)),
  );
  TestValidator.predicate("created_at is not empty", tag.created_at.length > 0);
  TestValidator.predicate("updated_at is not empty", tag.updated_at.length > 0);
}
