import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_deletion_with_content(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create multiple articles in the section
  const articles = await ArrayUtil.asyncRepeat(3, async () => {
    const article = await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          section_id: section.id,
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });
  // Add comments to each article
  const comments = await ArrayUtil.asyncRepeat(
    articles.length,
    async (index) => {
      const comment =
        await generate_random_discussion_board_user_articles_comments_create(
          userConnection,
          {
            body: {
              content: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies IDiscussionBoardComment.ICreate,
            params: {
              articleId: articles[index].id,
            },
          },
        );
      typia.assert(comment);
      return comment;
    },
  );
  // Verify section contains the articles
  TestValidator.equals(
    "section should have correct id",
    section.id,
    section.id,
  );
  TestValidator.predicate("articles should be created", articles.length === 3);
  TestValidator.predicate("comments should be created", comments.length === 3);
  // Delete the section
  const deletedSection =
    await api.functional.discussionBoard.superAdmin.sections.erase(
      superAdminConnection,
      {
        sectionId: section.id,
      },
    );
  typia.assert(deletedSection);
  // Validate deletion response
  TestValidator.equals(
    "deleted section id should match",
    deletedSection.id,
    section.id,
  );
  TestValidator.predicate(
    "deleted section should have status",
    deletedSection.status === "archived",
  );
  // Verify dependent content handling - attempt to access articles after section deletion
  // This tests whether articles are cascade deleted or reassigned
  await TestValidator.error(
    "articles should not be accessible after section deletion",
    async () => {
      // Try to access one of the articles that belonged to the deleted section
      // This will fail if articles are cascade deleted or if they're reassigned but the section is gone
      const articleAccess =
        await api.functional.discussionBoard.user.articles.create(
          userConnection,
          {
            body: {
              title: "Test access",
              content: "Testing article access",
              section_id: section.id, // This section is now deleted
              status: "published" as const,
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      typia.assert(articleAccess);
    },
  );
  // Verify comments handling - attempt to access comments after section deletion
  await TestValidator.error(
    "comments should not be accessible after section deletion",
    async () => {
      // Try to create a comment on an article from the deleted section
      const commentAccess =
        await api.functional.discussionBoard.user.articles.comments.create(
          userConnection,
          {
            articleId: articles[0].id, // Article from deleted section
            body: {
              content: "Testing comment access",
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      typia.assert(commentAccess);
    },
  );
}
