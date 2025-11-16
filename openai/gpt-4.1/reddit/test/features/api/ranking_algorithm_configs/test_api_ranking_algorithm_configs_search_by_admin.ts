import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformRankingAlgorithmConfigs";

/**
 * Validates administrator search/filter of ranking algorithm configuration
 * records.
 *
 * Ensures a platform administrator can execute search queries against
 * /communityPlatform/administrator/rankingAlgorithmConfigs with various
 * filters, ordering, and pagination parameters. Also tests that unauthenticated
 * actors are denied access. Verifies business policy, structure, typing, and
 * access control.
 *
 * Steps:
 *
 * 1. Register a new administrator for auth context
 * 2. Search with diverse filter and pagination combinations
 * 3. Validate correct paginated result structure, DTO types, and key business
 *    fields
 * 4. Assert unauthenticated access is rejected (security enforcement)
 */
export async function test_api_ranking_algorithm_configs_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Retrieve all results with no filters
  const allResults =
    await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allResults);
  typia.assert<IPageICommunityPlatformRankingAlgorithmConfigs.ISummary>(
    allResults,
  );
  typia.assert<IPage.IPagination>(allResults.pagination);
  await ArrayUtil.asyncForEach(allResults.data, async (el) =>
    typia.assert<ICommunityPlatformRankingAlgorithmConfigs.ISummary>(el),
  );

  // 3. Search with varied filters, sorting, pagination
  const now = new Date();
  const oneMonthAgo = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const filterInputs: ICommunityPlatformRankingAlgorithmConfigs.IRequest[] = [
    { algorithm_name: "hot" },
    { version: "v1.1" },
    { is_active: true },
    { is_active: false },
    { created_from: oneMonthAgo },
    { created_to: now.toISOString() },
    { order_by: "algorithm_name", order_direction: "asc" },
    {
      page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    },
    {
      algorithm_name: "top",
      version: "v2",
      is_active: true,
      page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
      order_by: "created_at",
      order_direction: "desc",
    },
  ];
  for (const body of filterInputs) {
    const result =
      await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.index(
        connection,
        { body },
      );
    typia.assert(result);
    typia.assert<IPageICommunityPlatformRankingAlgorithmConfigs.ISummary>(
      result,
    );
    typia.assert<IPage.IPagination>(result.pagination);
    TestValidator.equals(
      `paged result structure for filter: ${JSON.stringify(body)}`,
      Object.keys(result),
      ["pagination", "data"],
    );
    TestValidator.predicate(
      `data list for filter: ${JSON.stringify(body)} should be array`,
      Array.isArray(result.data),
    );
    await ArrayUtil.asyncForEach(result.data, async (el) =>
      typia.assert<ICommunityPlatformRankingAlgorithmConfigs.ISummary>(el),
    );
  }

  // 4. Test access denied for unauthenticated actor
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated actor cannot access admin config search",
    async () => {
      await api.functional.communityPlatform.administrator.rankingAlgorithmConfigs.index(
        unauthConn,
        { body: {} },
      );
    },
  );
}
