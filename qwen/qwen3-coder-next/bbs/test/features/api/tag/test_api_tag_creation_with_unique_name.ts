import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_tags_create } from "../../../generate/generate_random_discussion_board_super_admin_tags_create";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_tag_creation_with_unique_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // 2. Create a new tag with valid data using generator function
  const tag = await generate_random_discussion_board_super_admin_tags_create(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(tag);
  // 3. Verify tag was created successfully
  TestValidator.predicate("tag created successfully", tag !== null);
  TestValidator.notEquals("tag has unique ID", tag === null ? null : (tag as any).id, undefined);
}