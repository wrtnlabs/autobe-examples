import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminCredentials: IDiscussionBoardAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: adminPassword,
    display_name: RandomGenerator.name(),
  };
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword: string = RandomGenerator.alphaNumeric(16);
  const memberCredentials: IDiscussionBoardMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    displayName: RandomGenerator.name(),
    passwordConfirmation: memberPassword,
  };
  await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  // 3. Create article as member
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const articleBody: IDiscussionBoardArticle.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 3 }),
    section_id: sectionId,
  };
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      { body: articleBody },
    );
  typia.assert(article);
  // 4. Member creates comment
  const commentBody: IDiscussionBoardComment.ICreate = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const initialComment: IDiscussionBoardComment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        body: commentBody,
        params: { articleId: article.id },
      },
    );
  typia.assert(initialComment);
  const initialContent: string = initialComment.content;
  const initialUpdatedAt: string = initialComment.updated_at;
  // 5. Admin updates the comment
  const updatedContent: string =
    "Updated by admin: " + RandomGenerator.paragraph({ sentences: 1 });
  const updateBody: IDiscussionBoardComment.IUpdate = {
    content: updatedContent,
  };
  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: initialComment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedComment);
  // 6. Validate
  TestValidator.equals(
    "admin can update any comment",
    updatedComment.id,
    initialComment.id,
  );
  TestValidator.equals(
    "content is updated",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedComment.updated_at,
    initialUpdatedAt,
  );
}
