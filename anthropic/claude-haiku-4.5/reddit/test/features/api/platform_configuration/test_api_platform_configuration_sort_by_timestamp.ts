import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";

export async function test_api_platform_configuration_sort_by_timestamp(
  connection: api.IConnection,
) {
  // Create administrator account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Test 1: Sort configurations by created_at in ascending order (oldest first)
  const ascendingResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Validate ascending order by comparing timestamps
  for (let i = 0; i < ascendingResult.data.length - 1; i++) {
    const current = ascendingResult.data[i];
    const next = ascendingResult.data[i + 1];
    TestValidator.predicate(
      "configurations should be in ascending order by created_at",
      new Date(current.created_at).getTime() <=
        new Date(next.created_at).getTime(),
    );
  }

  // Test 2: Sort configurations by created_at in descending order (newest first)
  const descendingResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Validate descending order by comparing timestamps
  for (let i = 0; i < descendingResult.data.length - 1; i++) {
    const current = descendingResult.data[i];
    const next = descendingResult.data[i + 1];
    TestValidator.predicate(
      "configurations should be in descending order by created_at",
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }

  // Test 3: Sort configurations by updated_at in ascending order
  const updatedAscendingResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "updated_at",
          order: "asc",
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(updatedAscendingResult);

  // Validate updated_at ascending order
  for (let i = 0; i < updatedAscendingResult.data.length - 1; i++) {
    const current = updatedAscendingResult.data[i];
    const next = updatedAscendingResult.data[i + 1];
    TestValidator.predicate(
      "configurations should be in ascending order by updated_at",
      new Date(current.updated_at).getTime() <=
        new Date(next.updated_at).getTime(),
    );
  }

  // Test 4: Sort configurations by updated_at in descending order
  const updatedDescendingResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "updated_at",
          order: "desc",
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(updatedDescendingResult);

  // Validate updated_at descending order
  for (let i = 0; i < updatedDescendingResult.data.length - 1; i++) {
    const current = updatedDescendingResult.data[i];
    const next = updatedDescendingResult.data[i + 1];
    TestValidator.predicate(
      "configurations should be in descending order by updated_at",
      new Date(current.updated_at).getTime() >=
        new Date(next.updated_at).getTime(),
    );
  }

  // Validate that ascending and descending results have the same configurations but in different order
  TestValidator.equals(
    "ascending and descending results should have same number of items",
    ascendingResult.data.length,
    descendingResult.data.length,
  );

  // Verify pagination consistency
  TestValidator.predicate(
    "pagination should have valid page information",
    ascendingResult.pagination.current > 0 &&
      ascendingResult.pagination.limit > 0 &&
      ascendingResult.pagination.records >= 0 &&
      ascendingResult.pagination.pages > 0,
  );
}
