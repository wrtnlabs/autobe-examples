import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_admin_section_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/discussion-board",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create multiple test sections with varied names and descriptions
  const sections = await ArrayUtil.asyncRepeat(3, async (index) => {
    const baseName = `Test Section ${index}`;
    const baseDescription = `Description for section ${index}`;
    const section =
      await generate_random_discussion_board_admin_sections_create(
        adminConnection,
        {
          body: {
            name:
              baseName +
              (index === 1 ? " Unique" : index === 2 ? " Special" : ""),
            description:
              baseDescription +
              (index === 0
                ? " with keyword match"
                : index === 1
                  ? " containing special terms"
                  : ""),
            status: "active",
            display_order: index,
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    return section;
  });
  // Test 1: Search by partial name match
  const nameSearchResult =
    await api.functional.discussionBoard.admin.browse.index(adminConnection, {
      body: {
        search: "Unique",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(nameSearchResult);
  TestValidator.predicate(
    "name search returns results",
    nameSearchResult.data.length > 0,
  );
  TestValidator.predicate(
    "name search matches expected section",
    nameSearchResult.data.some((section) => section.name.includes("Unique")),
  );
  // Test 2: Search by description keyword
  const descSearchResult =
    await api.functional.discussionBoard.admin.browse.index(adminConnection, {
      body: {
        search: "keyword match",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(descSearchResult);
  TestValidator.predicate(
    "description search returns results",
    descSearchResult.data.length > 0,
  );
  TestValidator.predicate(
    "description search matches expected section",
    descSearchResult.data.some((section) =>
      section.description.includes("keyword match"),
    ),
  );
  // Test 3: Empty search returns all sections
  const emptySearchResult =
    await api.functional.discussionBoard.admin.browse.index(adminConnection, {
      body: {
        search: "",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns sections",
    emptySearchResult.data.length > 0,
  );
  // Test 4: Search term not matching any section returns empty
  const noMatchResult = await api.functional.discussionBoard.admin.browse.index(
    adminConnection,
    {
      body: {
        search: "NonExistentSearchTerm12345",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "non-matching search returns empty",
    noMatchResult.data.length,
    0,
  );
  // Test 5: Combine search with pagination
  const paginatedResult =
    await api.functional.discussionBoard.admin.browse.index(adminConnection, {
      body: {
        search: "Test",
        limit: 2,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination metadata present",
    paginatedResult.pagination !== undefined &&
      typeof paginatedResult.pagination === "object" &&
      Object.keys(paginatedResult.pagination).length > 0,
  );
}