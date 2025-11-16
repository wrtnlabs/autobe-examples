import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlag";

/**
 * End-to-end test for administrator feature flag pagination, filter, and
 * search.
 *
 * 1. Register and authenticate a new administrator.
 * 2. Create three feature flags, each having unique key, varying type and status.
 * 3. Perform paginated queries with different filter combinations:
 *
 *    - Basic page 1, limit 2
 *    - Filter by status
 *    - Filter by type
 *    - Fuzzy query on flag_key substring
 * 4. Validate:
 *
 *    - Auth response is valid and tokens present
 *    - Created flags appear in the results in expected combinations
 *    - Filters work and pagination metadata is consistent with the returned data
 */
export async function test_api_feature_flag_list_query_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "registered admin email matches",
    adminAuth.email,
    adminEmail,
  );
  TestValidator.predicate("admin has token", !!adminAuth.token?.access);

  // 2. Create three feature flags with varying values
  const featureFlags = await ArrayUtil.asyncMap(
    [
      {
        flag_key: `flag_basic_${RandomGenerator.alphaNumeric(5)}`,
        flag_type: "boolean",
        status: "enabled",
        description: RandomGenerator.paragraph(),
      },
      {
        flag_key: `flag_exp_${RandomGenerator.alphaNumeric(5)}`,
        flag_type: "percentage_rollout",
        status: "disabled",
        description: RandomGenerator.paragraph(),
      },
      {
        flag_key: `flag_var_${RandomGenerator.alphaNumeric(5)}`,
        flag_type: "variant",
        status: "scheduled",
        description: RandomGenerator.paragraph(),
      },
    ],
    async (flagInput) => {
      const flag =
        await api.functional.communityPlatform.administrator.featureFlags.create(
          connection,
          { body: flagInput satisfies ICommunityPlatformFeatureFlag.ICreate },
        );
      typia.assert(flag);
      return flag;
    },
  );

  // 3. Query all (page 1, limit 2, unfiltered)
  const resultPage1 =
    await api.functional.communityPlatform.administrator.featureFlags.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformFeatureFlag.IRequest,
      },
    );
  typia.assert(resultPage1);
  TestValidator.predicate(
    "pagination current=1, limit=2",
    resultPage1.pagination.current === 1 && resultPage1.pagination.limit === 2,
  );
  TestValidator.predicate(
    "result contains at least one of created flags",
    resultPage1.data.some((flag) => featureFlags.some((f) => f.id === flag.id)),
  );

  // 4. Filter by status (e.g. 'enabled')
  const enabledFlag = featureFlags.find((f) => f.status === "enabled");
  if (enabledFlag) {
    const pageEnabled =
      await api.functional.communityPlatform.administrator.featureFlags.index(
        connection,
        {
          body: {
            status: "enabled",
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies ICommunityPlatformFeatureFlag.IRequest,
        },
      );
    typia.assert(pageEnabled);
    TestValidator.predicate(
      "all filtered by status 'enabled'",
      pageEnabled.data.length > 0 &&
        pageEnabled.data.every((flag) => flag.status === "enabled"),
    );
    TestValidator.predicate(
      "enabled flag appears in filtered result",
      pageEnabled.data.some((flag) => flag.id === enabledFlag.id),
    );
  }

  // 5. Filter by type (e.g. 'boolean')
  const booleanFlag = featureFlags.find((f) => f.flag_type === "boolean");
  if (booleanFlag) {
    const pageBoolean =
      await api.functional.communityPlatform.administrator.featureFlags.index(
        connection,
        {
          body: {
            flag_type: "boolean",
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies ICommunityPlatformFeatureFlag.IRequest,
        },
      );
    typia.assert(pageBoolean);
    TestValidator.predicate(
      "all filtered by type 'boolean'",
      pageBoolean.data.length > 0 &&
        pageBoolean.data.every((flag) => flag.flag_type === "boolean"),
    );
    TestValidator.predicate(
      "boolean type flag appears in filtered result",
      pageBoolean.data.some((flag) => flag.id === booleanFlag.id),
    );
  }

  // 6. Fuzzy query: substring search on flag_key of first flag
  const fuzzySubstring = featureFlags[0].flag_key.substring(0, 6);
  const fuzzyPage =
    await api.functional.communityPlatform.administrator.featureFlags.index(
      connection,
      {
        body: {
          query: fuzzySubstring,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformFeatureFlag.IRequest,
      },
    );
  typia.assert(fuzzyPage);
  TestValidator.predicate(
    "fuzzy search returns at least one flag",
    fuzzyPage.data.length > 0,
  );
  TestValidator.predicate(
    "fuzzy search contains the relevant flag",
    fuzzyPage.data.some((flag) => flag.flag_key === featureFlags[0].flag_key),
  );

  // 7. Additional: validate pagination metadata
  TestValidator.predicate(
    "pagination.pages >= 1",
    resultPage1.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination.records >= data length",
    resultPage1.pagination.records >= resultPage1.data.length,
  );
}
