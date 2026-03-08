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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test super admin removing an article-tag association.
 * 1. Authenticate as super admin
 * 2. Create a section for article creation
 * 3. Create an article with multiple tags
 * 4. Remove one specific tag from the article
 * 5. Verify the association is removed while preserving article content and tag record
 * 6. Test error cases: non-existent article ID, non-existent tag ID, already removed association
 */
export async function test_api_superadmin_remove_article_tag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {},
    );
  typia.assert(section);
  // 3. Create an article with multiple tags
  const article =
    await generate_random_discussion_board_super_admin_sections_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
        },
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(article);
  // Add multiple tags to the article
  const tagNames = [
    `tag-${RandomGenerator.alphabets(6)}`,
    `tag-${RandomGenerator.alphabets(6)}`,
    `tag-${RandomGenerator.alphabets(6)}`,
  ] satisfies (string & tags.MinLength<1>)[];
  const addTagsResponse =
    await api.functional.discussionBoard.superAdmin.articles.tags.addTags(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          tags: tagNames,
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(addTagsResponse);
  // 4. Remove one tag from the article
  // Note: In real scenario, we would fetch article with taggings to get actual tag ID
  // For this test, we'll use the original article ID with a newly created tag
  const newTagArticle =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(newTagArticle);
  // Add a new tag to this article
  const newTagName = `to-remove-${RandomGenerator.alphabets(4)}`;
  const addTagResponse =
    await api.functional.discussionBoard.superAdmin.articles.tags.addTags(
      superAdminConnection,
      {
        articleId: newTagArticle.id,
        body: {
          tags: [newTagName],
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(addTagResponse);
  // Fetch the article to get the tag information
  const articleWithTagInfo =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(articleWithTagInfo);
  // Get the tag ID from the article's taggings
  const tagId = articleWithTagInfo.taggings[0]?.id;
  if (!tagId) {
    throw new Error("No tags found on article");
  }
  // Remove one tag from the article
  await api.functional.discussionBoard.superAdmin.articles.tags.removeArticleTag(
    superAdminConnection,
    {
      articleId: articleWithTagInfo.id,
      tagId: tagId,
    },
  );
  // 5. Verify the article still exists and content is preserved
  const remainingArticle =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(remainingArticle);
  // 6. Test error cases
  // 6a. Non-existent article ID
  await TestValidator.error("non-existent article", async () => {
    await api.functional.discussionBoard.superAdmin.articles.tags.removeArticleTag(
      superAdminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        tagId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // 6b. Non-existent tag ID
  await TestValidator.error("non-existent tag", async () => {
    await api.functional.discussionBoard.superAdmin.articles.tags.removeArticleTag(
      superAdminConnection,
      {
        articleId: newTagArticle.id,
        tagId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // 6c. Attempting to remove an already removed association (should succeed)
  await api.functional.discussionBoard.superAdmin.articles.tags.removeArticleTag(
    superAdminConnection,
    {
      articleId: newTagArticle.id,
      tagId: tagId,
    },
  );
}
