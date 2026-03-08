import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of sections list with default pagination and sorting.
 *
 * This test validates that an authenticated administrator can access the section
 * listing endpoint and receives a properly formatted paginated response.
 */
export async function test_api_section_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
    },
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token for subsequent requests
  const adminRequestConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Make PATCH request to sections endpoint with default pagination
  const sectionsResponse =
    await api.functional.economicPoliticalBoard.admin.sections.index(
      adminRequestConnection,
      {
        body: {}, // Default parameters: page=1, limit=20, sortBy=created_at, sortOrder=desc
      },
    );
  typia.assert(sectionsResponse);
  // 4. Validate pagination metadata
  const { pagination } = sectionsResponse;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit is 20", pagination.limit, 20);
  TestValidator.equals(
    "records matches data length",
    pagination.records,
    sectionsResponse.data.length,
  );
  TestValidator.equals(
    "pages calculated correctly",
    pagination.pages,
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit),
  );
  // 5. Validate each section contains all required fields
  if (sectionsResponse.data.length > 0) {
    const firstSection = typia.assert(sectionsResponse.data[0]!);
    // Validate UUID format for id
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstSection.id,
      ),
    );
    // Validate name is string and not empty
    TestValidator.predicate(
      "name is string",
      typeof firstSection.name === "string",
    );
    TestValidator.predicate("name is not empty", firstSection.name.length > 0);
    // Validate description is string or null
    TestValidator.predicate(
      "description is string or null",
      firstSection.description === null ||
        typeof firstSection.description === "string",
    );
    // Validate created_at is ISO 8601 datetime
    TestValidator.predicate(
      "created_at is valid datetime",
      !isNaN(Date.parse(firstSection.created_at)),
    );
    // Validate articleCount is non-negative integer
    TestValidator.predicate(
      "articleCount is non-negative",
      firstSection.articleCount >= 0,
    );
    TestValidator.predicate(
      "articleCount is integer",
      Number.isInteger(firstSection.articleCount),
    );
    // 6. Validate sections are sorted by created_at descending
    if (sectionsResponse.data.length >= 2) {
      const secondSection = typia.assert(sectionsResponse.data[1]!);
      TestValidator.predicate(
        "sections sorted by created_at descending",
        new Date(firstSection.created_at) >= new Date(secondSection.created_at),
      );
    }
  } else {
    // 7. Test empty database scenario
    TestValidator.equals("empty data array", sectionsResponse.data.length, 0);
    TestValidator.equals(
      "empty records",
      sectionsResponse.pagination.records,
      0,
    );
    TestValidator.equals("empty pages", sectionsResponse.pagination.pages, 0);
  }
}
