import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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

/**
 * Test section list search and filter functionality.
 * 1. Authenticate as administrator
 * 2. Create multiple sections with different names and descriptions
 * 3. Test name substring search
 * 4. Test description substring search
 * 5. Test creation date range filtering
 * 6. Test combined filters
 * 7. Validate pagination metadata
 */
export async function test_api_section_list_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. Create multiple sections with distinct names and descriptions
  const sections: IDiscussionBoardSection[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const section =
        await generate_random_discussion_board_admin_sections_create(
          adminConnection,
          {
            body: {
              name: `Section ${RandomGenerator.alphabets(3)} ${index}`,
              description: `This is a test description for section ${index} with keyword ${RandomGenerator.alphabets(4)}`,
            } satisfies IDiscussionBoardSection.ICreate,
          },
        );
      typia.assert(section);
      return section;
    },
  );
  // 3. Test name substring search
  const nameSearchTerm = sections[0].name.split(" ")[1]; // Get the random alphabets part
  const nameSearchResult =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        name: nameSearchTerm,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(nameSearchResult);
  TestValidator.equals(
    "name search returns matching sections",
    nameSearchResult.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "all results contain search term in name",
    nameSearchResult.data.every((s) => s.name.includes(nameSearchTerm)),
  );
  // 4. Test description substring search
  const descSearchTerm = RandomGenerator.alphabets(4);
  // Create a section with this specific description keyword
  const descSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: `Description Test ${RandomGenerator.alphabets(3)}`,
          description: `This section contains keyword ${descSearchTerm} in description`,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(descSection);
  const descSearchResult =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        description: descSearchTerm,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(descSearchResult);
  TestValidator.equals(
    "description search returns matching sections",
    descSearchResult.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "all results contain search term in description",
    descSearchResult.data.every(
      (s) => s.description !== null && s.description !== undefined && s.description.includes(descSearchTerm),
    ),
  );
  // 5. Test creation date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day ahead
  const dateRangeResult =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        created_at_from: pastDate.toISOString(),
        created_at_to: futureDate.toISOString(),
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter returns sections",
    dateRangeResult.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "all sections within date range",
    dateRangeResult.data.every(
      (s) =>
        new Date(s.created_at) >= pastDate &&
        new Date(s.created_at) <= futureDate,
    ),
  );
  // 6. Test combined filters (name + date range)
  const combinedResult =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        name: nameSearchTerm,
        created_at_from: pastDate.toISOString(),
        created_at_to: futureDate.toISOString(),
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter returns matching sections",
    combinedResult.data.every((s) => s.name.includes(nameSearchTerm)),
  );
  TestValidator.predicate(
    "combined filter respects date range",
    combinedResult.data.every(
      (s) =>
        new Date(s.created_at) >= pastDate &&
        new Date(s.created_at) <= futureDate,
    ),
  );
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    dateRangeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    dateRangeResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    dateRangeResult.pagination.records === dateRangeResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    dateRangeResult.pagination.pages >= 1,
  );
}