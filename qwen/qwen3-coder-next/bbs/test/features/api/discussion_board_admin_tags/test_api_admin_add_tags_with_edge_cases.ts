import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_admin_add_tags_with_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12341234",
      display_name: "Admin Test",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create an article to add tags to (using a test section ID)
  const article =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId: "test-section-id-0000-0000-0000-000000000001",
        body: {
          title: "Test Article for Tag Edge Cases",
          content: "Test content for testing tag edge cases",
        },
      },
    );
  typia.assert(article);
  // Test 1: Tags with leading/trailing whitespace (should be trimmed)
  const trimmedTags =
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tags: ["  tag1  ", "  tag2  ", "tag3"],
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(trimmedTags);
  TestValidator.equals(
    "tags with whitespace trimmed",
    trimmedTags.tagsAdded,
    3,
  );
  // Test 2: Empty strings in tag array (should be filtered out)
  const emptyTags =
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tags: ["validTag", "", "anotherValidTag", ""],
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(emptyTags);
  TestValidator.equals("empty strings filtered", emptyTags.tagsAdded, 2);
  // Test 3: Whitespace-only strings (should be filtered out)
  const whitespaceOnlyTags =
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tags: ["validTag", "   ", "\t", "\n", "anotherValid"],
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(whitespaceOnlyTags);
  TestValidator.equals(
    "whitespace-only filtered",
    whitespaceOnlyTags.tagsAdded,
    2,
  );
  // Test 4: Mixed valid and invalid tags (only valid ones should be added)
  const mixedTags =
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tags: ["valid1", "", "  valid2  ", "   ", "valid3", "\t", "valid4"],
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(mixedTags);
  TestValidator.equals("mixed valid/invalid tags", mixedTags.tagsAdded, 4);
  // Test 5: Special characters in tag names (should be accepted)
  const specialCharTags =
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tags: [
            "tag-with-hyphens",
            "tag_with_underscores",
            "tag.multiple.dots",
            "tag:with:colons",
          ],
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(specialCharTags);
  TestValidator.equals(
    "special characters accepted",
    specialCharTags.tagsAdded,
    4,
  );
}
