import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEnvironment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformEnvironment";

/**
 * Validates paginated environment listing with filtering and access control for
 * administrators.
 *
 * 1. Register and authenticate a new system administrator, ensuring privileged
 *    access for environment management.
 * 2. Create several (at least three) distinct community platform environments as
 *    test data, each with unique env_key, display_name, and description
 *    values.
 * 3. List all environments with no filters to verify that all created environments
 *    appear and pagination metadata is correct.
 * 4. Use env_key and display_name filter parameters (individually and together) to
 *    verify correct filtering behavior and partial matching.
 * 5. Filter for active environments (is_active: true) and then for
 *    archived/deleted ones (is_active: false). Confirm business logic for
 *    active/archived separation and edge case of empty results.
 * 6. Test sorting by env_key, display_name, and created_at (both ascending and
 *    descending order) to validate ordering.
 * 7. Paginate results using limit and page, verifying that metadata and returned
 *    items match expectations, including handling an empty page.
 * 8. Confirm that only authorized administrators can access listing: attempt to
 *    call the endpoint with an unauthenticated connection, expecting an error.
 * 9. For every response, validate the DTO shape using typia.assert and verify each
 *    ISummary matches what was created and expected for the filter.
 */
export async function test_api_environment_list_and_filtering_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as administrator (prerequisite)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<
          string & tags.Format<"password"> & tags.MinLength<8>
        >(),
        business_status: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(admin);

  // 2. Create several environments
  const envValues = [
    {
      env_key: "prod",
      display_name: "Production",
      description: "Primary environment for live deployments",
    },
    {
      env_key: "stage",
      display_name: "Staging",
      description: "Pre-release environment for QA",
    },
    {
      env_key: RandomGenerator.alphaNumeric(8).toLowerCase(),
      display_name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  ];
  const createdEnvs: ICommunityPlatformEnvironment[] = [];
  for (const env of envValues) {
    const created =
      await api.functional.communityPlatform.administrator.environments.create(
        connection,
        {
          body: {
            env_key: env.env_key,
            display_name: env.display_name,
            description: env.description,
          },
        },
      );
    typia.assert(created);
    // All new environments must be active (deleted_at null or undefined)
    TestValidator.equals(
      "created environment is active (not archived)",
      created.deleted_at,
      null,
    );
    createdEnvs.push(created);
  }

  // 3. List environments with no filter -- expect all created, correct pagination
  const allList =
    await api.functional.communityPlatform.administrator.environments.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allList);
  TestValidator.predicate(
    "all created environments appear in list",
    createdEnvs.every((env) => allList.data.some((x) => x.id === env.id)),
  );
  TestValidator.equals(
    "pagination: limit matches default or total count",
    allList.pagination.limit >= createdEnvs.length,
    true,
  );
  TestValidator.predicate(
    "pagination: at least one page exists",
    allList.pagination.pages >= 1,
  );

  // 4. Filtering by env_key & display_name: partial and full matches
  for (const env of createdEnvs) {
    const partialKey = env.env_key.slice(
      0,
      Math.max(2, Math.floor(env.env_key.length / 2)),
    );
    const keyList =
      await api.functional.communityPlatform.administrator.environments.index(
        connection,
        {
          body: { env_key: partialKey },
        },
      );
    typia.assert(keyList);
    TestValidator.predicate(
      `env_key filter returns at least one correct environment for ${env.env_key}`,
      keyList.data.some((x) => x.id === env.id),
    );

    const partialName = env.display_name.slice(
      0,
      Math.max(2, Math.floor(env.display_name.length / 2)),
    );
    const nameList =
      await api.functional.communityPlatform.administrator.environments.index(
        connection,
        {
          body: { display_name: partialName },
        },
      );
    typia.assert(nameList);
    TestValidator.predicate(
      `display_name filter returns at least one correct environment for ${env.display_name}`,
      nameList.data.some((x) => x.id === env.id),
    );

    const bothList =
      await api.functional.communityPlatform.administrator.environments.index(
        connection,
        {
          body: { env_key: env.env_key, display_name: env.display_name },
        },
      );
    typia.assert(bothList);
    TestValidator.equals(
      `exact env_key & display_name returns only the expected environment for ${env.env_key}`,
      bothList.data.length,
      1,
    );
    TestValidator.equals(
      `environment matches by key & name for ${env.env_key}`,
      bothList.data[0].id,
      env.id,
    );
  }

  // 5. Filtering by is_active: active should find all; archived/none edge case.
  const active =
    await api.functional.communityPlatform.administrator.environments.index(
      connection,
      {
        body: { is_active: true },
      },
    );
  typia.assert(active);
  TestValidator.predicate(
    "is_active=true lists all active (not archived) environments",
    createdEnvs.every((env) => active.data.some((x) => x.id === env.id)),
  );

  const archived =
    await api.functional.communityPlatform.administrator.environments.index(
      connection,
      {
        body: { is_active: false },
      },
    );
  typia.assert(archived);
  TestValidator.equals(
    "is_active=false yields empty result as no env is archived",
    archived.data.length,
    0,
  );

  // 6. Test sorting (env_key, display_name, created_at), both orders.
  for (const [sortKey, field] of [
    ["env_key", (x: ICommunityPlatformEnvironment) => x.env_key],
    ["display_name", (x: ICommunityPlatformEnvironment) => x.display_name],
    ["created_at", (x: ICommunityPlatformEnvironment) => x.created_at],
  ] as const) {
    for (const sortOrder of ["asc", "desc"] as const) {
      const sortedApi =
        await api.functional.communityPlatform.administrator.environments.index(
          connection,
          {
            body: { sort_by: sortKey, sort_order: sortOrder },
          },
        );
      typia.assert(sortedApi);
      const local = [...createdEnvs].sort((a, b) => {
        if (field(a) < field(b)) return sortOrder === "asc" ? -1 : 1;
        if (field(a) > field(b)) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
      for (let i = 0; i < Math.min(local.length, sortedApi.data.length); ++i) {
        TestValidator.equals(
          `${sortKey} ${sortOrder} sort index ${i}`,
          sortedApi.data[i].id,
          local[i].id,
        );
      }
    }
  }

  // 7. Paginate: limit=1, page varies, check length and metadata, and empty page
  for (let page = 0; page < createdEnvs.length + 2; ++page) {
    const paged =
      await api.functional.communityPlatform.administrator.environments.index(
        connection,
        {
          body: {
            limit: 1 as number & tags.Type<"int32">,
            page: page as number & tags.Type<"int32">,
          },
        },
      );
    typia.assert(paged);
    if (page < createdEnvs.length) {
      TestValidator.equals(
        `pagination: page ${page} returns 1 record`,
        paged.data.length,
        1,
      );
      TestValidator.equals(
        `pagination: total records matches total created`,
        paged.pagination.records,
        createdEnvs.length,
      );
    } else {
      TestValidator.equals(
        `pagination: page ${page} past end returns 0 records`,
        paged.data.length,
        0,
      );
    }
  }

  // 8. Unauthorized: listing endpoint without admin token fails
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized environment list request fails",
    async () => {
      await api.functional.communityPlatform.administrator.environments.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );

  // 9. DTO validation on every entity
  allList.data.forEach((record) => typia.assert(record));
  active.data.forEach((record) => typia.assert(record));
  for (const env of createdEnvs) {
    const exact =
      await api.functional.communityPlatform.administrator.environments.index(
        connection,
        {
          body: { env_key: env.env_key, display_name: env.display_name },
        },
      );
    typia.assert(exact);
    exact.data.forEach((record) => typia.assert(record));
    if (exact.data.length > 0)
      TestValidator.equals(
        `entity ids match for env_key/display_name exact match`,
        exact.data[0].id,
        env.id,
      );
  }
}
