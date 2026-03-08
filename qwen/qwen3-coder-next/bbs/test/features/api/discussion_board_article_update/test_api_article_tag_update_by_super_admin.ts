import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_tag_update_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular member to create article
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResponse =
    await api.functional.discussionBoard.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberJoinResponse);
  const memberLoginResponse =
    await api.functional.discussionBoard.auth.member.login(memberConnection, {
      body: {
        email: memberJoinResponse.email,
        password: "1234",
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(memberLoginResponse);
  // 2. Create super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResponse =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "1234",
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 3 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminJoinResponse);
  const superAdminLoginResponse =
    await api.functional.discussionBoard.auth.superAdmin.login(
      superAdminConnection,
      {
        body: {
          email: superAdminJoinResponse.email,
          password: "1234",
        } satisfies IDiscussionBoardSuperAdmin.ILogin,
      },
    );
  typia.assert(superAdminLoginResponse);
  // 3. Create article with initial content as a regular member
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          title: "Initial Article Title",
          content: "Initial content for the article",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Super admin updates article with new content
  const updatedArticle =
    await api.functional.discussionBoard.superAdmin.articles.update(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          title: "Updated Article Title",
          content: "Updated content for the article",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 5. Validate super admin can update any article
  TestValidator.equals(
    "super admin updated title",
    updatedArticle.title,
    "Updated Article Title",
  );
  TestValidator.equals(
    "super admin updated content",
    updatedArticle.content,
    "Updated content for the article",
  );
  TestValidator.equals(
    "author unchanged",
    updatedArticle.author.id,
    article.author.id,
  );
  TestValidator.notEquals("title changed", updatedArticle.title, article.title);
}
