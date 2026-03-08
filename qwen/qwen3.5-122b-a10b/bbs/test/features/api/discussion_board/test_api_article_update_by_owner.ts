import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Admin creates a section
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Member creates an article with initial tags
  const initialTags = ["tag1", "tag2", "tag3"];
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
        tags: initialTags,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Store original timestamps
  const originalCreatedAt = article.created_at;
  const originalUpdatedAt = article.updated_at;
  // 4. Member updates the article with new title, body, and different tags
  const newTags = ["updated_tag1", "updated_tag2"];
  const updatedArticle =
    await api.functional.discussionBoard.admin.articles.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 5 }),
          tags: newTags,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 5. Validate timestamps - updated_at should change, created_at should remain
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedArticle.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedArticle.created_at,
    originalCreatedAt,
  );
  // 6. Validate tags are completely replaced (not appended)
  TestValidator.equals(
    "tag count matches new tags",
    updatedArticle.tags.length,
    newTags.length,
  );
  TestValidator.equals(
    "first tag matches",
    updatedArticle.tags[0]?.name,
    newTags[0],
  );
  TestValidator.equals(
    "second tag matches",
    updatedArticle.tags[1]?.name,
    newTags[1],
  );
  // 7. Validate article associations
  TestValidator.equals(
    "author ID matches member",
    updatedArticle.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "section ID matches",
    updatedArticle.section.id,
    section.id,
  );
  TestValidator.predicate(
    "title was updated",
    updatedArticle.title !== article.title,
  );
  TestValidator.predicate(
    "body was updated",
    updatedArticle.body !== article.body,
  );
}
