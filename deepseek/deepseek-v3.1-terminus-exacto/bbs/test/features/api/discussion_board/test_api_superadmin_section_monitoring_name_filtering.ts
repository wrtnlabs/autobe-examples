import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_superadmin_section_monitoring_name_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create test sections with similar names for filtering scenarios
  const politicsSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Politics",
          description:
            "Discussions about political topics and government policies",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(politicsSection);
  const politicsCurrentSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Current Politics",
          description: "Latest political news and current events",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(politicsCurrentSection);
  const economySection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Economy",
          description: "Economic discussions and financial topics",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(economySection);
  // Test partial name matching
  const partialSearch =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: "polit",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(partialSearch);
  TestValidator.predicate(
    "partial search returns politics sections",
    partialSearch.data.length >= 2,
  );
  // Test case-insensitive matching
  const caseSearch =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: "POLITICS",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(caseSearch);
  TestValidator.predicate(
    "case-insensitive search returns results",
    caseSearch.data.length >= 1,
  );
  // Test description keyword search
  const descriptionSearch =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: "government",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(descriptionSearch);
  TestValidator.predicate(
    "description search returns matching sections",
    descriptionSearch.data.length >= 1,
  );
  // Test pagination with filtered results
  const paginatedSearch =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: "politics",
          limit: 1,
          page: 1,
          sort: "name:asc",
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination limit enforced",
    paginatedSearch.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination metadata present",
    paginatedSearch.pagination.records >= 2,
  );
  // Test edge case: very long search term
  const longSearchTerm = RandomGenerator.paragraph({ sentences: 5 });
  const longSearch =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: longSearchTerm,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(longSearch);
  // Test exact matching behavior with created sections
  const exactSearch =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: "Politics",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(exactSearch);
  // Verify that sections with similar names are properly filtered
  const politicsSections = partialSearch.data.filter((section) =>
    section.name.toLowerCase().includes("polit"),
  );
  TestValidator.predicate(
    "similar name sections found",
    politicsSections.length >= 2,
  );
  // Validate that search results contain the expected sections
  const foundPoliticsSection = partialSearch.data.some(
    (section) => section.id === politicsSection.id,
  );
  TestValidator.predicate(
    "original politics section found in search",
    foundPoliticsSection,
  );
  const foundCurrentPoliticsSection = partialSearch.data.some(
    (section) => section.id === politicsCurrentSection.id,
  );
  TestValidator.predicate(
    "current politics section found in search",
    foundCurrentPoliticsSection,
  );
  // Test that economy section is NOT returned in politics search
  const foundEconomySection = partialSearch.data.some(
    (section) => section.id === economySection.id,
  );
  TestValidator.predicate(
    "economy section not returned in politics search",
    !foundEconomySection,
  );
}
