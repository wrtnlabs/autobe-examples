import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_listing_default_browsing(
  connection: api.IConnection,
): Promise<void> {
  // Guest browsing with default parameters (empty body)
  const result: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {} satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(result);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination.current >= 0",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit >= 0",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    result.pagination.pages >= 0,
  );
  // Validate pagination consistency
  if (result.pagination.records > 0) {
    TestValidator.predicate(
      "pages >= 1 when records exist",
      result.pagination.pages >= 1,
    );
    TestValidator.predicate(
      "data array not empty when records > 0",
      result.data.length > 0,
    );
  } else {
    TestValidator.predicate(
      "pages is 0 when no records",
      result.pagination.pages === 0,
    );
    TestValidator.predicate(
      "data array empty when no records",
      result.data.length === 0,
    );
  }
  // Validate data array exists and is array type
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // If articles exist, validate article structure and business logic
  if (result.data.length > 0) {
    const firstArticle = result.data[0];
    // Validate UUID format for article ID
    TestValidator.predicate(
      "article id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstArticle.id,
      ),
    );
    // Validate article has non-empty title
    TestValidator.predicate(
      "article title is non-empty",
      firstArticle.title.length > 0,
    );
    // Validate author summary exists with required fields
    TestValidator.predicate(
      "author id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstArticle.author.id,
      ),
    );
    TestValidator.predicate(
      "author displayName is non-empty",
      firstArticle.author.displayName.length > 0,
    );
    TestValidator.predicate(
      "author articleCount >= 0",
      firstArticle.author.articleCount >= 0,
    );
    TestValidator.predicate(
      "author commentCount >= 0",
      firstArticle.author.commentCount >= 0,
    );
    // Validate section summary exists with required fields
    TestValidator.predicate(
      "section id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstArticle.section.id,
      ),
    );
    TestValidator.predicate(
      "section name is non-empty",
      firstArticle.section.name.length > 0,
    );
    TestValidator.predicate(
      "section article_count >= 0",
      firstArticle.section.article_count >= 0,
    );
    // Validate creator exists
    TestValidator.predicate(
      "creator id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstArticle.section.creator.id,
      ),
    );
    TestValidator.predicate(
      "creator display_name is non-empty",
      firstArticle.section.creator.display_name.length > 0,
    );
    // Validate tags array
    TestValidator.predicate("tags is array", Array.isArray(firstArticle.tags));
    // If tags exist, validate tag structure
    if (firstArticle.tags.length > 0) {
      const firstTag = firstArticle.tags[0];
      TestValidator.predicate(
        "tag id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstTag.id,
        ),
      );
      TestValidator.predicate(
        "tag name is non-empty",
        firstTag.name.length > 0,
      );
      TestValidator.predicate(
        "tag article_count >= 0",
        firstTag.article_count >= 0,
      );
    }
    // Validate comments_count is non-negative
    TestValidator.predicate(
      "comments_count >= 0",
      firstArticle.comments_count >= 0,
    );
    // Validate timestamps are valid ISO date-time format
    TestValidator.predicate(
      "created_at is valid ISO date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}(T|\s)[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstArticle.created_at,
      ),
    );
    TestValidator.predicate(
      "updated_at is valid ISO date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}(T|\s)[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstArticle.updated_at,
      ),
    );
    // Validate deleted_at is either null or valid ISO date-time
    if (firstArticle.deleted_at !== null) {
      TestValidator.predicate(
        "deleted_at is valid ISO date-time",
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}(T|\s)[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          firstArticle.deleted_at,
        ),
      );
    }
  }
}
