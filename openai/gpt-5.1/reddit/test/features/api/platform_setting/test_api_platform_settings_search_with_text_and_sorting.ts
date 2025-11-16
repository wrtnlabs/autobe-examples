import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPlatformSetting";

export async function test_api_platform_settings_search_with_text_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and authenticate
  const adminJoinInput = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // ip is optional; omit for simplicity
    href: "https://admin.console.example.com/signup",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Create multiple deterministic platform settings with distinct keys and descriptions
  const settingsToCreate: ICommunityPlatformPlatformSetting.ICreate[] = [
    {
      key: `karma.community_creation_threshold.${RandomGenerator.alphabets(6)}`,
      value: "100",
      description:
        "controls community creation karma threshold for new communities",
      is_active: true,
    },
    {
      key: `voting.max_votes_per_hour.${RandomGenerator.alphabets(6)}`,
      value: "60",
      description: "limits voting rate per hour across all communities",
      is_active: true,
    },
    {
      key: `posts.daily_creation_limit.${RandomGenerator.alphabets(6)}`,
      value: "20",
      description: "controls daily post creation limit per user",
      is_active: false,
    },
    {
      key: `ranking.experimental_algorithm_toggle.${RandomGenerator.alphabets(6)}`,
      value: "true",
      description: "toggles experimental ranking algorithm for feed ordering",
      is_active: true,
    },
  ];

  const createdSettings: ICommunityPlatformPlatformSetting[] = [];
  for (const createBody of settingsToCreate) {
    const created =
      await api.functional.communityPlatform.platformAdmin.platformSettings.create(
        connection,
        { body: createBody },
      );
    typia.assert<ICommunityPlatformPlatformSetting>(created);
    createdSettings.push(created);
  }

  // Helper to find a setting by description substring
  const findByDescriptionSubstring = (substring: string) =>
    createdSettings.find((s) => s.description.includes(substring));

  // 3. Text search: choose substring that should match exactly one description
  const uniqueSearchTerm = "community creation karma";
  const targetForUniqueSearch = findByDescriptionSubstring(uniqueSearchTerm);
  TestValidator.predicate(
    "a setting with the unique search term must exist in created settings",
    targetForUniqueSearch !== undefined,
  );

  const uniqueSearchRequestBody = {
    page: 1,
    limit: 10,
    isActive: null,
    key: null,
    search: uniqueSearchTerm,
    createdFrom: null,
    createdTo: null,
    updatedFrom: null,
    updatedTo: null,
    orderBy: null,
    orderDirection: null,
  } satisfies ICommunityPlatformPlatformSetting.IRequest;

  const uniqueSearchResponse =
    await api.functional.communityPlatform.platformAdmin.platformSettings.index(
      connection,
      { body: uniqueSearchRequestBody },
    );
  typia.assert<IPageICommunityPlatformPlatformSetting.ISummary>(
    uniqueSearchResponse,
  );

  const uniquePagination = uniqueSearchResponse.pagination;
  const uniqueData = uniqueSearchResponse.data;

  TestValidator.equals(
    "unique search pagination.current should be 1",
    uniquePagination.current,
    1,
  );
  TestValidator.equals(
    "unique search pagination.limit should equal requested limit",
    uniquePagination.limit,
    uniqueSearchRequestBody.limit,
  );

  TestValidator.equals(
    "unique search should find exactly one matching record in pagination.records",
    uniquePagination.records,
    1,
  );
  TestValidator.equals(
    "unique search should return exactly one data row",
    uniqueData.length,
    1,
  );

  const uniqueSummary = uniqueData[0];
  TestValidator.equals(
    "unique search summary id should match created setting id",
    uniqueSummary.id,
    targetForUniqueSearch!.id,
  );
  TestValidator.equals(
    "unique search summary key should match created setting key",
    uniqueSummary.key,
    targetForUniqueSearch!.key,
  );
  TestValidator.equals(
    "unique search summary value should match created setting value",
    uniqueSummary.value,
    targetForUniqueSearch!.value,
  );
  TestValidator.equals(
    "unique search summary description should match created setting description",
    uniqueSummary.description,
    targetForUniqueSearch!.description,
  );
  TestValidator.equals(
    "unique search summary is_active should match created setting is_active",
    uniqueSummary.is_active,
    targetForUniqueSearch!.is_active,
  );
  TestValidator.equals(
    "unique search summary created_at should match created setting created_at",
    uniqueSummary.created_at,
    targetForUniqueSearch!.created_at,
  );
  TestValidator.equals(
    "unique search summary updated_at should match created setting updated_at",
    uniqueSummary.updated_at,
    targetForUniqueSearch!.updated_at,
  );
  TestValidator.equals(
    "unique search summary deleted_at should match created setting deleted_at",
    uniqueSummary.deleted_at ?? null,
    (targetForUniqueSearch!.deleted_at ?? null) as string | null,
  );

  // Ensure no unrelated settings (by id) appear in the result
  const unrelatedInUnique = createdSettings.filter(
    (s) => s.id !== targetForUniqueSearch!.id,
  );
  TestValidator.predicate(
    "unique search result must not contain any unrelated ids",
    unrelatedInUnique.every(
      (s) => uniqueData.find((d) => d.id === s.id) === undefined,
    ),
  );

  // 4. Sorting by created_at ascending with broader search (search null => include all)
  const sortByCreatedAscRequestBody = {
    page: 1,
    limit: 10,
    isActive: null,
    key: null,
    search: null,
    createdFrom: null,
    createdTo: null,
    updatedFrom: null,
    updatedTo: null,
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies ICommunityPlatformPlatformSetting.IRequest;

  const sortByCreatedAscResponse =
    await api.functional.communityPlatform.platformAdmin.platformSettings.index(
      connection,
      { body: sortByCreatedAscRequestBody },
    );
  typia.assert<IPageICommunityPlatformPlatformSetting.ISummary>(
    sortByCreatedAscResponse,
  );

  const createdAscPagination = sortByCreatedAscResponse.pagination;
  const createdAscData = sortByCreatedAscResponse.data;

  TestValidator.equals(
    "created_at asc pagination.current should be 1",
    createdAscPagination.current,
    1,
  );
  TestValidator.equals(
    "created_at asc pagination.limit should equal requested limit",
    createdAscPagination.limit,
    sortByCreatedAscRequestBody.limit,
  );

  TestValidator.predicate(
    "created_at asc should have at least as many records as created settings (or more including preexisting)",
    createdAscPagination.records >= createdSettings.length,
  );

  if (createdAscData.length >= 2) {
    TestValidator.predicate(
      "data should be sorted by created_at ascending",
      createdAscData.every((current, index, array) => {
        if (index === 0) return true;
        const prev = array[index - 1];
        return prev.created_at <= current.created_at;
      }),
    );
  }

  // 5. Sorting by key descending
  const sortByKeyDescRequestBody = {
    page: 1,
    limit: 10,
    isActive: null,
    key: null,
    search: null,
    createdFrom: null,
    createdTo: null,
    updatedFrom: null,
    updatedTo: null,
    orderBy: "key" as const,
    orderDirection: "desc" as const,
  } satisfies ICommunityPlatformPlatformSetting.IRequest;

  const sortByKeyDescResponse =
    await api.functional.communityPlatform.platformAdmin.platformSettings.index(
      connection,
      { body: sortByKeyDescRequestBody },
    );
  typia.assert<IPageICommunityPlatformPlatformSetting.ISummary>(
    sortByKeyDescResponse,
  );

  const keyDescPagination = sortByKeyDescResponse.pagination;
  const keyDescData = sortByKeyDescResponse.data;

  TestValidator.equals(
    "key desc pagination.current should be 1",
    keyDescPagination.current,
    1,
  );
  TestValidator.equals(
    "key desc pagination.limit should equal requested limit",
    keyDescPagination.limit,
    sortByKeyDescRequestBody.limit,
  );
  TestValidator.predicate(
    "key desc should have at least as many records as created settings (or more including preexisting)",
    keyDescPagination.records >= createdSettings.length,
  );

  if (keyDescData.length >= 2) {
    TestValidator.predicate(
      "data should be sorted by key descending",
      keyDescData.every((current, index, array) => {
        if (index === 0) return true;
        const prev = array[index - 1];
        return prev.key >= current.key;
      }),
    );
  }
}
