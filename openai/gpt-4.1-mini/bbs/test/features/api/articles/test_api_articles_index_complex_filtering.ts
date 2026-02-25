import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_articles_index_complex_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user to obtain authentication tokens
  const userJoinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_registered_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Use base connection for article index API (no auth required)
  // Prepare complex filtering and sorting request
  // We generate a new dummy sectionId and tagIds to filter, no guarantee of result data
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const tagIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const searchKeyword = RandomGenerator.substring(
    RandomGenerator.content({ paragraphs: 3 }),
  );
  const page = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const requestBody = {
    search: searchKeyword,
    sectionId: sectionId,
    tags: tagIds,
    page: page,
    limit: limit,
    sort: "oldest",
  } satisfies IDiscussionBoardArticle.IRequest;
  const output =
    await api.functional.discussionBoard.registeredUser.articles.index(
      { host: connection.host },
      { body: requestBody },
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    output.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", output.pagination.limit, limit);
  TestValidator.predicate(
    "total records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    output.pagination.pages >= 0,
  );
  // 4. Validate data array consistency
  for (const article of output.data) {
    typia.assert(article);
    // article must contain valid UUID id
    TestValidator.predicate(
      "article id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.id,
      ),
    );
    // title and createdAt must be non-empty
    TestValidator.predicate(
      "article title non-empty",
      article.title.length > 0,
    );
    TestValidator.predicate(
      "article createdAt is valid date-time",
      typeof article.createdAt === "string" && article.createdAt.length > 0,
    );
    // author must match IDiscussionBoardRegisteredUser.ISummary
    typia.assert(article.author);
    TestValidator.predicate(
      "author id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.author.id,
      ),
    );
    TestValidator.predicate(
      "author email non-empty",
      article.author.email.length > 0,
    );
    TestValidator.predicate(
      "author displayName non-empty",
      article.author.displayName.length > 0,
    );
    TestValidator.predicate(
      "author isBanned is boolean",
      typeof article.author.isBanned === "boolean",
    );
    TestValidator.predicate(
      "author createdAt is valid date-time",
      typeof article.author.createdAt === "string" &&
        article.author.createdAt.length > 0,
    );
    // section must be an object (the structure is empty so just check existence)
    TestValidator.predicate(
      "article section exists",
      article.section !== null && article.section !== undefined,
    );
    // commentCount must be a number >= 0
    TestValidator.predicate(
      "commentCount non-negative",
      typeof article.commentCount === "number" && article.commentCount >= 0,
    );
    // tags is array and each tag has id and properties
    TestValidator.predicate("tags is array", Array.isArray(article.tags));
    for (const tag of article.tags) {
      typia.assert(tag);
      TestValidator.predicate(
        "tag id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          tag.id,
        ),
      );
      TestValidator.predicate(
        "tag discussionBoardArticleId is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          tag.discussionBoardArticleId,
        ),
      );
      TestValidator.predicate(
        "tag discussionBoardTagId is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          tag.discussionBoardTagId,
        ),
      );
      TestValidator.predicate(
        "tag createdAt is valid date-time",
        typeof tag.createdAt === "string" && tag.createdAt.length > 0,
      );
    }
  }
}
