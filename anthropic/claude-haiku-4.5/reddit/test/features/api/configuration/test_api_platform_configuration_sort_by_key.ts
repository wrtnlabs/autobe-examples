import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";

/**
 * Test sorting platform configurations by key field.
 *
 * This test validates the sorting functionality of the configuration management
 * API. It verifies that configurations can be sorted by key in both ascending
 * and descending order, and that the sorting is consistent across multiple
 * pages of results.
 *
 * Test workflow:
 *
 * 1. Create administrator account for authentication
 * 2. Retrieve configurations sorted by key in ascending order
 * 3. Validate that configuration keys are in alphabetical order
 * 4. Retrieve configurations sorted by key in descending order
 * 5. Validate that configuration keys are in reverse alphabetical order
 * 6. Test pagination consistency with sorting
 */
export async function test_api_platform_configuration_sort_by_key(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Retrieve configurations sorted by key in ascending order
  const ascendingResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "key",
          order: "asc",
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 3: Validate ascending order - configuration keys should be in alphabetical order
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = ascendingResult.data[i].key;
      const next = ascendingResult.data[i + 1].key;
      TestValidator.predicate(
        `ascending order: key "${current}" should be <= "${next}"`,
        current.localeCompare(next) <= 0,
      );
    }
  }

  // Step 4: Retrieve configurations sorted by key in descending order
  const descendingResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "key",
          order: "desc",
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 5: Validate descending order - configuration keys should be in reverse alphabetical order
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = descendingResult.data[i].key;
      const next = descendingResult.data[i + 1].key;
      TestValidator.predicate(
        `descending order: key "${current}" should be >= "${next}"`,
        current.localeCompare(next) >= 0,
      );
    }
  }

  // Step 6: Verify opposite ordering between ascending and descending
  if (ascendingResult.data.length > 0 && descendingResult.data.length > 0) {
    TestValidator.equals(
      "first ascending key should equal last descending key",
      ascendingResult.data[0].key,
      descendingResult.data[descendingResult.data.length - 1].key,
    );

    TestValidator.equals(
      "last ascending key should equal first descending key",
      ascendingResult.data[ascendingResult.data.length - 1].key,
      descendingResult.data[0].key,
    );
  }

  // Step 7: Test pagination consistency - verify second page maintains order
  if (ascendingResult.pagination.pages > 1) {
    const secondPageAscending: IPageICommunityPlatformConfiguration.ISummary =
      await api.functional.communityPlatform.administrator.configurations.index(
        connection,
        {
          body: {
            page: 2,
            limit: 50,
            sort_by: "key",
            order: "asc",
          } satisfies ICommunityPlatformConfiguration.IRequest,
        },
      );
    typia.assert(secondPageAscending);

    // Verify that first key of page 2 comes after last key of page 1
    if (
      ascendingResult.data.length > 0 &&
      secondPageAscending.data.length > 0
    ) {
      const lastKeyPage1 =
        ascendingResult.data[ascendingResult.data.length - 1].key;
      const firstKeyPage2 = secondPageAscending.data[0].key;
      TestValidator.predicate(
        "second page first key should be >= first page last key",
        lastKeyPage1.localeCompare(firstKeyPage2) <= 0,
      );
    }

    // Verify order within second page
    if (secondPageAscending.data.length > 1) {
      for (let i = 0; i < secondPageAscending.data.length - 1; i++) {
        const current = secondPageAscending.data[i].key;
        const next = secondPageAscending.data[i + 1].key;
        TestValidator.predicate(
          `page 2 ascending order: key "${current}" should be <= "${next}"`,
          current.localeCompare(next) <= 0,
        );
      }
    }
  }

  // Step 8: Verify total record count is consistent
  TestValidator.equals(
    "ascending and descending results should have same total records",
    ascendingResult.pagination.records,
    descendingResult.pagination.records,
  );
}
