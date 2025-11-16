import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemConfig";

export async function test_api_system_configs_search_basic_pagination_by_admin_user(
  connection: api.IConnection,
) {
  // 1. AdminUser join to obtain authenticated admin context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed system configs for categories "auth" and "ui" (and one null category)
  const authCount = 3;
  const uiCount = 2;

  const createdAuthConfigs: ICommunityPlatformSystemConfig[] = [];
  const createdUiConfigs: ICommunityPlatformSystemConfig[] = [];

  for (let i = 0; i < authCount; i++) {
    const body = {
      category: "auth",
      config_key: `auth_config_${i}`,
      value: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      is_active: true,
    } satisfies ICommunityPlatformSystemConfig.ICreate;

    const created =
      await api.functional.communityPlatform.adminUser.systemConfigs.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdAuthConfigs.push(created);
  }

  for (let i = 0; i < uiCount; i++) {
    const body = {
      category: "ui",
      config_key: `ui_config_${i}`,
      value: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      is_active: true,
    } satisfies ICommunityPlatformSystemConfig.ICreate;

    const created =
      await api.functional.communityPlatform.adminUser.systemConfigs.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdUiConfigs.push(created);
  }

  // null-category config
  const nullCategoryBody = {
    category: null,
    config_key: "global_config_null_category",
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const nullCategoryConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: nullCategoryBody },
    );
  typia.assert(nullCategoryConfig);

  // 3. Perform first page search: category = "auth", page=1, limit=2
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<200>;

  const requestPage1 = {
    page,
    limit,
    category: "auth",
  } satisfies ICommunityPlatformSystemConfig.IRequest;

  const page1: IPageICommunityPlatformSystemConfig.ISummary =
    await api.functional.communityPlatform.adminUser.systemConfigs.index(
      connection,
      { body: requestPage1 },
    );
  typia.assert(page1);

  // 4. Validate pagination metadata for page 1
  TestValidator.equals(
    "pagination.current should be 1 for first page",
    page1.pagination.current,
    1 as number,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit on page 1",
    page1.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination.records should be at least number of created auth configs",
    page1.pagination.records >= createdAuthConfigs.length,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 1",
    page1.pagination.pages >= 1,
  );

  // Validate content for page 1: all category === "auth" and data length <= limit
  TestValidator.predicate(
    "page1.data length should be <= limit",
    page1.data.length <= limit,
  );

  for (const summary of page1.data) {
    typia.assert(summary);
    TestValidator.equals(
      "each page1 summary category should be 'auth'",
      summary.category,
      "auth",
    );
  }

  // Ensure at least one created auth config is in page1 results by id match
  const page1Ids = page1.data.map((it) => it.id);
  const hasKnownAuthInPage1 = createdAuthConfigs.some((cfg) =>
    page1Ids.includes(cfg.id),
  );
  TestValidator.predicate(
    "at least one created auth config appears in page1",
    hasKnownAuthInPage1,
  );

  // 5. Optional: request page 2
  const page2Request = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    category: "auth",
  } satisfies ICommunityPlatformSystemConfig.IRequest;

  const page2: IPageICommunityPlatformSystemConfig.ISummary =
    await api.functional.communityPlatform.adminUser.systemConfigs.index(
      connection,
      { body: page2Request },
    );
  typia.assert(page2);

  TestValidator.equals(
    "pagination.current should be 2 for second page",
    page2.pagination.current,
    2 as number,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit on page 2",
    page2.pagination.limit,
    limit,
  );

  // Validate content for page 2: category filter and length <= limit
  TestValidator.predicate(
    "page2.data length should be <= limit",
    page2.data.length <= limit,
  );

  for (const summary of page2.data) {
    typia.assert(summary);
    TestValidator.equals(
      "each page2 summary category should be 'auth'",
      summary.category,
      "auth",
    );
  }

  // Ensure no duplicate ids between page1 and page2
  const page2Ids = page2.data.map((it) => it.id);
  const concatIds = [...page1Ids, ...page2Ids];
  const uniqueIds = new Set(concatIds);
  TestValidator.equals(
    "concatenated ids across pages should be unique (no duplicates)",
    concatIds.length,
    uniqueIds.size,
  );
}
