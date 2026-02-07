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
) {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      member_id: typia.random<string & tags.Format<"uuid">>(),
      admin_role_id: typia.random<string & tags.Format<"uuid">>(),
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create new tag
  const tagName = `test-tag-${RandomGenerator.alphaNumeric(8)}`;
  const tag = await api.functional.discussionBoard.admin.tags.create(
    adminConnection,
    {
      body: {
        name: tagName,
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag);
}
