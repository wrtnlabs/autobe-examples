import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_super_admin_update_with_timestamp(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for article author
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: {} satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Authenticate as member and create article
  const articleAuthorConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.login(
    articleAuthorConnection,
    {
      body: {} satisfies IDiscussionBoardMember.ILogin,
    },
  );
  // Create test article
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      articleAuthorConnection,
      {
        sectionId: sectionId,
        body: {} satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Extract article id - cast to IEntity to access id property
  const articleId = (article as IEntity).id;
  // Store original properties - using type assertion to access properties not defined in DTO
  const originalArticle = article as unknown as {
    updated_at: string;
    author_id: string;
    section_id: string;
  };
  const originalUpdatedAt = originalArticle.updated_at;
  const originalAuthorId = originalArticle.author_id;
  const originalSectionId = originalArticle.section_id;
  // 3. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.login(
    superAdminConnection,
    {
      body: {} satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  // 4. Update article as super admin
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedContent = RandomGenerator.content({ paragraphs: 3 });
  const updatedArticle =
    await api.functional.discussionBoard.superAdmin.articles.update(
      superAdminConnection,
      {
        articleId: articleId,
        body: {
          title: updatedTitle,
          content: updatedContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 5. Validate timestamp changed and content updated
  const updatedArticleInternal = updatedArticle as unknown as {
    updated_at: string;
    author_id: string;
    section_id: string;
    title: string;
    content: string;
  };
  TestValidator.notEquals(
    "updated_at timestamp changed",
    originalUpdatedAt,
    updatedArticleInternal.updated_at,
  );
  TestValidator.equals(
    "title updated",
    updatedTitle,
    updatedArticleInternal.title,
  );
  TestValidator.equals(
    "content updated",
    updatedContent,
    updatedArticleInternal.content,
  );
  // Validate other properties remain unchanged
  TestValidator.equals(
    "author_id unchanged",
    originalAuthorId,
    updatedArticleInternal.author_id,
  );
  TestValidator.equals(
    "section_id unchanged",
    originalSectionId,
    updatedArticleInternal.section_id,
  );
}
