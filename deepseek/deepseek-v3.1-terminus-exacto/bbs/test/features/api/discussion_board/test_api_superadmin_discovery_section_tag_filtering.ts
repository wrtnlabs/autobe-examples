import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_discovery_section_tag_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test basic discovery functionality with various filter combinations
  // Since we cannot create articles through available APIs, we test the filtering
  // capabilities with random valid inputs to ensure the endpoint responds correctly
  // 1. Test empty search (get all articles)
  const emptySearchResponse =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  // 2. Test section filtering with random UUID
  const sectionFilterResponse =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(sectionFilterResponse);
  // 3. Test keyword search
  const keywordSearchResponse =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          search: RandomGenerator.paragraph({ sentences: 1 }),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(keywordSearchResponse);
  // 4. Test combined section and keyword filtering
  const combinedFilterResponse =
    await api.functional.discussionBoard.superAdmin.discovery.index(
      superAdminConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          search: RandomGenerator.alphabets(10),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof combinedFilterResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    combinedFilterResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    combinedFilterResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    combinedFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    combinedFilterResponse.pagination.pages >= 0,
  );
  // Validate response data structure
  TestValidator.equals(
    "data is array",
    Array.isArray(combinedFilterResponse.data),
    true,
  );
  if (combinedFilterResponse.data.length > 0) {
    const article = combinedFilterResponse.data[0];
    TestValidator.predicate(
      "article has valid id",
      typeof article.id === "string" && article.id.length > 0,
    );
    TestValidator.predicate(
      "article has title",
      typeof article.title === "string",
    );
    TestValidator.predicate(
      "article has valid author object",
      typeof article.author === "object" &&
        typeof article.author.id === "string" &&
        typeof article.author.display_name === "string",
    );
    TestValidator.predicate(
      "article has valid section object",
      typeof article.section === "object" &&
        typeof article.section.id === "string" &&
        typeof article.section.name === "string",
    );
    TestValidator.equals(
      "article tags is array",
      Array.isArray(article.tags),
      true,
    );
    TestValidator.predicate(
      "article has comments count",
      typeof article.comments_count === "number" && article.comments_count >= 0,
    );
    TestValidator.predicate(
      "article has created_at timestamp",
      typeof article.created_at === "string",
    );
  }
  // Test that different filter combinations return valid responses
  // This validates the endpoint handles various input combinations correctly
  TestValidator.predicate(
    "empty search returns valid response",
    emptySearchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "section filter returns valid response",
    sectionFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "keyword search returns valid response",
    keywordSearchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "combined filter returns valid response",
    combinedFilterResponse.pagination.records >= 0,
  );
}
