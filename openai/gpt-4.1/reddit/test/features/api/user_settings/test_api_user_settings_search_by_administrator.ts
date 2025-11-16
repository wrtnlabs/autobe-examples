import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSettings";

/**
 * Validates that a newly-registered administrator can perform a filtered and
 * paginated search for user settings.
 *
 * 1. Register a new administrator and obtain valid authorization.
 * 2. As administrator, perform an advanced user settings search using random
 *    filter values for language, theme, and default_post_sort.
 * 3. Verify the pagination summary and that user settings returned match the
 *    filter criteria.
 * 4. Ensure at least one page of settings data (if any matches exist), and all
 *    results conform to the filters supplied.
 */
export async function test_api_user_settings_search_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_status: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2. Prepare advanced filter parameters for user settings search
  // Pick random filter values (simulate plausible admin business scenario + test filter logic):
  const languageOptions = ["en-US", "ko-KR", "ja-JP", "zh-CN"] as const;
  const themeOptions = ["light", "dark", "system"] as const;
  const postSortOptions = ["hot", "new", "top", "controversial"] as const;

  const filterRequest = {
    language: RandomGenerator.pick(languageOptions),
    theme: RandomGenerator.pick(themeOptions),
    default_post_sort: RandomGenerator.pick(postSortOptions),
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformUserSettings.IRequest;

  // 3. Search user settings as admin with filters applied
  const result: IPageICommunityPlatformUserSettings.ISummary =
    await api.functional.communityPlatform.administrator.userSettings.index(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(result);

  // 4. Verify the pagination structure and filtered results
  TestValidator.predicate(
    "pagination fields are present",
    result.pagination &&
      typeof result.pagination.current === "number" &&
      typeof result.pagination.limit === "number" &&
      typeof result.pagination.records === "number" &&
      typeof result.pagination.pages === "number",
  );

  // If results exist (data array not empty), verify all records match supplied filters
  if (result.data.length > 0) {
    for (const record of result.data) {
      // Validate language
      TestValidator.equals(
        "record matches requested language",
        record.language,
        filterRequest.language,
      );
      // Validate theme
      TestValidator.equals(
        "record matches requested theme",
        record.theme,
        filterRequest.theme,
      );
      // Validate default_post_sort
      TestValidator.equals(
        "record matches requested default_post_sort",
        record.default_post_sort,
        filterRequest.default_post_sort,
      );
    }
  }

  // Export all runtime validations via typia
  typia.assert(result.data);
}
