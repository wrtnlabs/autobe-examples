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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_view_with_complete_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create an article with random valid data
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // 3. Retrieve the article by ID
  const retrievedArticle = await api.functional.discussionBoard.articles.at(
    memberConnection,
    {
      articleId: article.id,
    },
  );
  typia.assert(retrievedArticle);
  // 4. Verify author metadata (IDiscussionBoardMember.ISummary)
  TestValidator.equals(
    "author id matches",
    retrievedArticle.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedArticle.author.displayName,
    article.author.displayName,
  );
  TestValidator.predicate(
    "author bio is string or null",
    typeof retrievedArticle.author.bio === "string" ||
      retrievedArticle.author.bio === null,
  );
  TestValidator.predicate(
    "author articleCount is non-negative",
    typeof retrievedArticle.author.articleCount === "number" &&
      retrievedArticle.author.articleCount >= 0,
  );
  TestValidator.predicate(
    "author commentCount is non-negative",
    typeof retrievedArticle.author.commentCount === "number" &&
      retrievedArticle.author.commentCount >= 0,
  );
  TestValidator.predicate(
    "author createdAt is ISO 8601 date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      retrievedArticle.author.createdAt,
    ),
  );
  TestValidator.predicate(
    "author updatedAt is ISO 8601 date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      retrievedArticle.author.updatedAt,
    ),
  );
  // 5. Verify section metadata (IDiscussionBoardSection.ISummary)
  TestValidator.predicate(
    "section id is uuid",
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(
      retrievedArticle.section.id,
    ),
  );
  TestValidator.predicate(
    "section name is non-empty string",
    typeof retrievedArticle.section.name === "string" &&
      retrievedArticle.section.name.length > 0,
  );
  TestValidator.predicate(
    "section description is string or null",
    typeof retrievedArticle.section.description === "string" ||
      retrievedArticle.section.description === null,
  );
  TestValidator.predicate(
    "section created_at is ISO 8601 date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      retrievedArticle.section.created_at,
    ),
  );
  TestValidator.predicate(
    "section creator exists",
    retrievedArticle.section.creator !== null &&
      retrievedArticle.section.creator !== undefined,
  );
  TestValidator.predicate(
    "section article_count is non-negative",
    typeof retrievedArticle.section.article_count === "number" &&
      retrievedArticle.section.article_count >= 0,
  );
  // 6. Verify tags array (IDiscussionBoardTag.ISummary[])
  TestValidator.predicate(
    "tags array exists",
    Array.isArray(retrievedArticle.tags),
  );
  if (retrievedArticle.tags.length > 0) {
    retrievedArticle.tags.forEach((tag, index) => {
      TestValidator.predicate(
        `tag[${index}] id is uuid`,
        /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(tag.id),
      );
      TestValidator.predicate(
        `tag[${index}] name is non-empty string`,
        typeof tag.name === "string" && tag.name.length > 0,
      );
      TestValidator.predicate(
        `tag[${index}] description is string or null`,
        typeof tag.description === "string" || tag.description === null,
      );
      TestValidator.predicate(
        `tag[${index}] article_count is non-negative`,
        typeof tag.article_count === "number" && tag.article_count >= 0,
      );
      TestValidator.predicate(
        `tag[${index}] created_at is ISO 8601 date-time`,
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
          tag.created_at,
        ),
      );
    });
  }
  // 7. Verify comments_count is non-negative number
  TestValidator.predicate(
    "comments_count is non-negative",
    typeof retrievedArticle.comments_count === "number" &&
      retrievedArticle.comments_count >= 0,
  );
  // 8. Verify article timestamps are ISO 8601 formatted
  TestValidator.predicate(
    "article created_at is ISO 8601 date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      retrievedArticle.created_at,
    ),
  );
  TestValidator.predicate(
    "article updated_at is ISO 8601 date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      retrievedArticle.updated_at,
    ),
  );
  // 9. Verify deleted_at is null for published articles
  TestValidator.equals(
    "deleted_at is null for published article",
    retrievedArticle.deleted_at,
    null,
  );
}
