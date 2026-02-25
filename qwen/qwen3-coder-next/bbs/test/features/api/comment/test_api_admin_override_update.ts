import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test administrator override update of comment created by another user.
 * 1. Authenticate as super admin to enable admin creation
 * 2. Authenticate as regular admin
 * 3. Authenticate as regular member and create a comment
 * 4. Admin updates the member's comment (override update)
 * 5. Validate the update was successful
 */
export async function test_api_admin_override_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.login(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "1234",
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  // Step 2: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Step 3: Authenticate as regular member and create a comment
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.login(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      href: "http://localhost" satisfies string & tags.Format<"uri">,
      referrer: "http://localhost" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // Create a test article first (required for comment creation)
  const testArticle =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          content: "Test article content",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(testArticle);
  // Create a comment as member
  const memberComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: testArticle.id,
        body: {
          content: "Original member comment",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(memberComment);
  // Step 4: Admin updates the comment (override update)
  const updatedComment =
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: memberComment.id,
        body: {
          content: "Admin updated comment content",
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Step 5: Validate the update
  typia.assert(updatedComment);
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    "Admin updated comment content",
  );
  TestValidator.equals(
    "comment author unchanged",
    updatedComment.author.id,
    memberComment.author.id,
  );
}
