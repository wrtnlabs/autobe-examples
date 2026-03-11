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

export async function test_api_superadmin_popular_filtering_sections(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Call popular endpoint without section filter to get baseline
  const baselineResponse =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(baselineResponse);
  // If there are articles in the response, test section filtering
  if (baselineResponse.data.length > 0) {
    // Get a section ID from one of the articles
    const sectionId = baselineResponse.data[0].section.id;
    // Test filtering by that section
    const filteredResponse =
      await api.functional.discussionBoard.superAdmin.popular.index(
        superAdminConnection,
        {
          body: {
            discussion_board_section_id: sectionId,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(filteredResponse);
    // Validate that all returned articles belong to the specified section
    TestValidator.predicate(
      "all filtered articles belong to specified section",
      filteredResponse.data.every(
        (article) => article.section.id === sectionId,
      ),
    );
    // Validate that the number of articles in the filtered response is less than or equal to baseline
    TestValidator.predicate(
      "filtered count <= baseline count",
      filteredResponse.data.length <= baselineResponse.data.length,
    );
    // Validate pagination metadata
    TestValidator.equals(
      "pagination limit",
      filteredResponse.pagination.limit,
      10,
    );
    TestValidator.equals(
      "pagination current page",
      filteredResponse.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination records valid",
      filteredResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages valid",
      filteredResponse.pagination.pages >= 0,
    );
  }
  // Test 2: Filter by non-existent section
  const nonExistentSectionResponse =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(nonExistentSectionResponse);
  // Non-existent section should return empty results or valid empty response
  TestValidator.predicate(
    "non-existent section returns valid response",
    nonExistentSectionResponse.data.length >= 0,
  );
  // Test 3: Filter with different pagination parameters
  const paginatedResponse =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResponse.data.length <= 5,
  );
  TestValidator.equals(
    "pagination metadata limit",
    paginatedResponse.pagination.limit,
    5,
  );
  // Validate article structure for any returned articles
  if (baselineResponse.data.length > 0) {
    baselineResponse.data.forEach((article, index) => {
      TestValidator.predicate(
        `article ${index} has valid id`,
        typeof article.id === "string" && article.id.length > 0,
      );
      TestValidator.predicate(
        `article ${index} has valid title`,
        typeof article.title === "string" && article.title.length > 0,
      );
      TestValidator.predicate(
        `article ${index} has valid author`,
        article.author && typeof article.author.id === "string",
      );
      TestValidator.predicate(
        `article ${index} has valid section`,
        article.section && typeof article.section.id === "string",
      );
      TestValidator.predicate(
        `article ${index} has valid tags array`,
        Array.isArray(article.tags),
      );
      TestValidator.predicate(
        `article ${index} has valid comments count`,
        typeof article.comments_count === "number" &&
          article.comments_count >= 0,
      );
      TestValidator.predicate(
        `article ${index} has valid created_at`,
        typeof article.created_at === "string" && article.created_at.length > 0,
      );
    });
  }
}
