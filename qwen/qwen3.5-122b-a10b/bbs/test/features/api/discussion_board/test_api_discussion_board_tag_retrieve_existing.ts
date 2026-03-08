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

export async function test_api_discussion_board_tag_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuth.token.access}` },
  };
  // 3. Create a test tag using admin connection
  const tag = await generate_random_discussion_board_admin_tags_create(
    adminConnection,
    {},
  );
  typia.assert(tag);
  // 4. Create guest connection (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  // 5. Retrieve the tag using guest connection
  const retrievedTag = await api.functional.discussionBoard.tags.at(
    guestConnection,
    {
      tagId: tag.id,
    },
  );
  typia.assert(retrievedTag);
  // 6. Validate business logic
  TestValidator.equals("tag id matches", retrievedTag.id, tag.id);
  TestValidator.equals("tag name matches", retrievedTag.name, tag.name);
  TestValidator.predicate(
    "deleted_at is null (active tag)",
    retrievedTag.deleted_at === null,
  );
  TestValidator.predicate(
    "article_count is non-negative",
    retrievedTag.article_count >= 0,
  );
}
