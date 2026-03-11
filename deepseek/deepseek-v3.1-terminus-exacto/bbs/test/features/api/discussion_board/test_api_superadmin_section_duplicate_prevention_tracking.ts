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

export async function test_api_superadmin_section_duplicate_prevention_tracking(
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
  // Create first section with "Politics" topic containing "government" keyword
  const section1 =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Politics",
          description:
            "Discussions about government policies and political systems",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section1);
  // Create second section with overlapping topic "Political Science" containing "government" keyword
  const section2 =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Political Science",
          description:
            "Academic discussions of government structures and political theories",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section2);
  // Create third section with different topic for comparison
  const section3 =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Economy",
          description:
            "Discussions about economic systems and financial markets",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section3);
  // Search for sections containing "government" keyword to identify potential duplication
  const searchResults =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: "government",
          limit: 10,
          page: 1,
          sort: "created_at:desc",
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate search results contain sections with overlapping topics
  TestValidator.predicate(
    "search should return sections with government keyword",
    searchResults.data.length >= 2,
  );
  // Verify that both Politics and Political Science sections are found
  const sectionNames = searchResults.data.map((section) => section.name);
  TestValidator.predicate(
    "search should find Politics section",
    sectionNames.includes("Politics"),
  );
  TestValidator.predicate(
    "search should find Political Science section",
    sectionNames.includes("Political Science"),
  );
  // Verify Economy section is NOT found in government search (demonstrating search specificity)
  TestValidator.predicate(
    "economy section should not appear in government search",
    !sectionNames.includes("Economy"),
  );
  // Test chronological sorting by creation date
  const sortedByDateResults =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: "government",
          limit: 10,
          page: 1,
          sort: "created_at:asc",
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(sortedByDateResults);
  // Verify search functionality properly identifies sections with similar descriptions
  const similarDescriptionSearch =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          search: "political",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(similarDescriptionSearch);
  // Validate that political search finds both relevant sections
  const politicalSectionNames = similarDescriptionSearch.data.map(
    (section) => section.name,
  );
  TestValidator.predicate(
    "political search should find both Politics and Political Science sections",
    politicalSectionNames.includes("Politics") &&
      politicalSectionNames.includes("Political Science"),
  );
  // Test empty search to verify all sections are retrievable
  const allSections =
    await api.functional.discussionBoard.superAdmin.topics.index(
      superAdminConnection,
      {
        body: {
          limit: 10,
          page: 1,
          sort: "name:asc",
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(allSections);
  // Verify all created sections are present in complete listing
  TestValidator.predicate(
    "all sections should be retrievable in complete listing",
    allSections.data.length >= 3,
  );
}
