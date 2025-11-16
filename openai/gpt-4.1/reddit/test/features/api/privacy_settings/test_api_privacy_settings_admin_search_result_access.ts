import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPrivacySettings";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPrivacySettings";

export async function test_api_privacy_settings_admin_search_result_access(
  connection: api.IConnection,
) {
  // 1. Administrator join/authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Aa1-" + RandomGenerator.alphaNumeric(8);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(admin);

  // 2. Unfiltered search (default paging)
  const unfiltered =
    await api.functional.communityPlatform.administrator.privacySettings.index(
      connection,
      { body: {} },
    );
  typia.assert(unfiltered);
  TestValidator.predicate(
    "unfiltered search returns data array",
    Array.isArray(unfiltered.data),
  );
  TestValidator.predicate("pagination info exists", !!unfiltered.pagination);

  // 3. Filtering by enum/boolean fields
  const visibilities = ["public", "private", "follower_only"] as const;
  for (const visibility of visibilities) {
    const filtered =
      await api.functional.communityPlatform.administrator.privacySettings.index(
        connection,
        { body: { profile_visibility: visibility } },
      );
    typia.assert(filtered);
    for (const rec of filtered.data) {
      TestValidator.equals(
        `profile_visibility = ${visibility}`,
        rec.profile_visibility,
        visibility,
      );
    }
  }
  for (const search of [true, false]) {
    for (const exportEnabled of [true, false]) {
      const filtered =
        await api.functional.communityPlatform.administrator.privacySettings.index(
          connection,
          {
            body: {
              search_discoverable: search,
              data_export_enabled: exportEnabled,
            },
          },
        );
      typia.assert(filtered);
      for (const rec of filtered.data) {
        TestValidator.equals(
          `search_discoverable = ${search}`,
          rec.search_discoverable,
          search,
        );
        TestValidator.equals(
          `data_export_enabled = ${exportEnabled}`,
          rec.data_export_enabled,
          exportEnabled,
        );
      }
    }
  }

  // 4. Paging combinations
  const pagingCombos = [
    { limit: 2, page: 1 },
    { limit: 3, page: 2 },
    { limit: 5, page: 1 },
  ];
  for (const { limit, page } of pagingCombos) {
    const paged =
      await api.functional.communityPlatform.administrator.privacySettings.index(
        connection,
        {
          body: {
            limit: limit satisfies number as number,
            page: page satisfies number as number,
          },
        },
      );
    typia.assert(paged);
    TestValidator.equals(
      `pagination.limit = ${limit}`,
      paged.pagination.limit,
      limit satisfies number as number,
    );
    TestValidator.equals(
      `pagination.current = ${page}`,
      paged.pagination.current,
      page satisfies number as number,
    );
  }
}
