import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_super_admin_comment_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: superAdminPassword,
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create member account for posting comment
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
        displayName: RandomGenerator.name(),
        passwordConfirmation: memberPassword,
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // 3. Login as member and create an article first
  const memberLogin = await api.functional.discussionBoard.auth.member.login(
    memberConnection,
    {
      body: {
        email: member.member.email,
        password: memberPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  typia.assert(memberLogin);
  // 4. Create a comment on the article
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: typia.random<string>(),
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Login as super administrator
  const superAdminLogin =
    await api.functional.discussionBoard.auth.superAdmin.login(
      superAdminConnection,
      {
        body: {
          email: superAdmin.email,
          password: superAdminPassword,
        } satisfies IDiscussionBoardSuperAdmin.ILogin,
      },
    );
  typia.assert(superAdminLogin);
  // 6. Delete the comment as super administrator
  await api.functional.discussionBoard.superAdmin.comments.erase(
    superAdminConnection,
    {
      commentId: comment.id,
    },
  );
}
