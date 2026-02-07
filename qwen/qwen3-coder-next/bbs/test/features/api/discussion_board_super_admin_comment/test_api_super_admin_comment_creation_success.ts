import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_comments_create } from "../../../generate/generate_random_discussion_board_super_admin_comments_create";
import { prepare_random_discussion_board_article_comment } from "../../../prepare/prepare_random_discussion_board_article_comment";

export async function test_api_super_admin_comment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register super admin account
  const superAdminCredentials =
    typia.random<IDiscussionBoardSuperAdmin.IJoin>();
  const superAdminAuth =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: superAdminCredentials,
      },
    );
  typia.assert(superAdminAuth);
  // Step 2: Create comment as super admin
  const commentContent = typia.random<IDiscussionBoardArticleComment.ICreate>();
  const createdComment =
    await api.functional.discussionBoard.superAdmin.comments.create(
      superAdminConnection,
      {
        body: commentContent,
      },
    );
  typia.assert(createdComment);
}
