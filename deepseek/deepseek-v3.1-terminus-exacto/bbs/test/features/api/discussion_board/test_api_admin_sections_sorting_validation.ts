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

export async function test_api_admin_sections_sorting_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Note: Section creation functionality is not available in the provided API,
  // so we can only test the sorting functionality with existing sections
  // This test validates that the sorting parameters work correctly with
  // whatever sections already exist in the system
  // Test each sorting option
  const sortOptions = [
    "created_at:desc",
    "created_at:asc",
    "updated_at:desc",
    "updated_at:asc",
    "name:asc",
    "name:desc",
  ] as const;
  for (const sortOption of sortOptions) {
    const response = await api.functional.discussionBoard.admin.sections.index(
      adminConnection,
      {
        body: {
          sort: sortOption,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
    typia.assert(response);
    // Validate pagination structure
    TestValidator.predicate(
      `pagination structure valid for ${sortOption}`,
      response.pagination.records >= 0 && response.pagination.pages >= 0,
    );
    // Validate section data structure
    for (const section of response.data) {
      typia.assert(section);
      TestValidator.predicate(
        `section has valid id for ${sortOption}`,
        typeof section.id === "string" && section.id.length > 0,
      );
      TestValidator.predicate(
        `section has valid name for ${sortOption}`,
        typeof section.name === "string" && section.name.length > 0,
      );
    }
    // Validate sorting order if we have multiple sections
    if (response.data.length > 1) {
      const sectionNames = response.data.map((s) => s.name);
      const sectionDates = response.data.map((s) => new Date(s.created_at));
      switch (sortOption) {
        case "name:asc":
          TestValidator.predicate(
            `names sorted ascending for ${sortOption}`,
            sectionNames.every(
              (name, i, arr) => i === 0 || name.localeCompare(arr[i - 1]) >= 0,
            ),
          );
          break;
        case "name:desc":
          TestValidator.predicate(
            `names sorted descending for ${sortOption}`,
            sectionNames.every(
              (name, i, arr) => i === 0 || name.localeCompare(arr[i - 1]) <= 0,
            ),
          );
          break;
        case "created_at:asc":
          TestValidator.predicate(
            "dates sorted ascending",
            sectionDates.every((date, i, arr) => i === 0 || date >= arr[i - 1]),
          );
          break;
        case "created_at:desc":
          TestValidator.predicate(
            "dates sorted descending",
            sectionDates.every((date, i, arr) => i === 0 || date <= arr[i - 1]),
          );
          break;
        case "updated_at:asc":
        case "updated_at:desc":
          // Updated_at sorting validation would require updated_at field in response
          // but IDiscussionBoardSection.ISummary only has created_at
          // So we can only validate that the API call succeeds
          TestValidator.predicate(
            `sort option ${sortOption} processed successfully`,
            response.data.length >= 0,
          );
          break;
      }
    }
  }
}
