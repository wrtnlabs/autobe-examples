import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_comment_update_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates section
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminLoginConnection,
    {},
  );
  typia.assert(section);
  // 2. Member1 creates article and comment (owns the comment)
  const member1Password = RandomGenerator.alphaNumeric(16);
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: member1Password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member1Auth);
  const member1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(member1LoginConnection, {
    body: {
      email: member1Auth.email,
      password: member1Password,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  const article = await generate_random_discussion_board_member_articles_create(
    member1LoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  const originalCommentContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      member1LoginConnection,
      {
        params: { articleId: article.id },
        body: {
          content: originalCommentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  const originalUpdatedAt = comment.updated_at;
  // 3. Member2 attempts to update Member1's comment
  const member2Password = RandomGenerator.alphaNumeric(16);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: member2Password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member2Auth);
  const member2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(member2LoginConnection, {
    body: {
      email: member2Auth.email,
      password: member2Password,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 4. Validate rejection with 403 Forbidden
  await TestValidator.httpError(
    "non-owner cannot update comment",
    403,
    async () => {
      await api.functional.discussionBoard.member.articles.comments.update(
        member2LoginConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: "Updated by non-owner",
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
  // 5. Verify original comment content remains unchanged
  const refreshedComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      member1LoginConnection,
      {
        articleId: article.id,
        body: {
          content: originalCommentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(refreshedComment);
  TestValidator.equals(
    "comment content unchanged",
    refreshedComment.content,
    originalCommentContent,
  );
  TestValidator.predicate(
    "updated_at timestamp unchanged",
    refreshedComment.updated_at === originalUpdatedAt,
  );
}
