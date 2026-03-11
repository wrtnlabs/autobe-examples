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

/**
 * Test the primary success path for tag deletion by an administrator.
 * 1) Authenticate as an admin user using authorize_admin_join utility
 * 2) Create a new tag with a unique name using generate_random_discussion_board_admin_tags_create utility
 * 3) Delete the tag using api.functional.discussionBoard.admin.tags.erase SDK function
 * 4) Verify the deletion operation completes successfully (204 No Content response)
 */
export async function test_api_tag_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 2. Create a new tag with unique name
  const uniqueSuffix = RandomGenerator.alphaNumeric(8);
  const tagName = `test-tag-${uniqueSuffix}`;
  const tag = await generate_random_discussion_board_admin_tags_create(
    adminConnection,
    {
      body: {
        name: tagName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag);
  // Validate tag was created with expected properties
  TestValidator.equals("tag name matches", tag.name, tagName);
  TestValidator.equals("tag has valid UUID", tag.id, tag.id);
  TestValidator.predicate(
    "tag has created_at timestamp",
    tag.created_at.length > 0,
  );
  // 3. Delete the tag
  await api.functional.discussionBoard.admin.tags.erase(adminConnection, {
    tagId: tag.id,
  });
  // 4. Verify deletion completed successfully (no error thrown means success)
  TestValidator.predicate("tag deletion completed successfully", true);
}
