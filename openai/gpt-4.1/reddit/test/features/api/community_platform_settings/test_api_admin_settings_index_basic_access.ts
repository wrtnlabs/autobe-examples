import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSettings";

/**
 * Validate basic admin-only paginated access to system settings list with
 * search, filter, and sort options.
 *
 * 1. Register a new admin via api.functional.auth.admin.join to obtain credentials
 *    and token.
 * 2. Using the authenticated admin, request the paginated settings list via
 *    api.functional.communityPlatform.admin.settings.index.
 * 3. For each of these, execute test cases:
 *
 *    - No filters (retrieve first page, validate pagination and data shape)
 *    - Search by partial 'setting_key'
 *    - Filter by 'type' and 'is_active'
 *    - Sort by 'setting_key', 'type', and 'is_active' in both directions
 * 4. For each response, ensure (a) pagination information is present and correct,
 *    (b) 'data' contains setting summaries with correct metadata fields.
 * 5. Access restriction: test an unauthenticated connection, and assert it is
 *    denied.
 */
export async function test_api_admin_settings_index_basic_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    href: "https://admin.example.com/registration",
    referrer: "https://admin.example.com/landing",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin token assigned",
    typeof adminAuth.token.access === "string" &&
      adminAuth.token.access.length > 0,
  );

  // 2. Retrieve settings list with no filters (default pagination)
  const reqDefault = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformSettings.IRequest;
  const defaultPage =
    await api.functional.communityPlatform.admin.settings.index(connection, {
      body: reqDefault,
    });
  typia.assert(defaultPage);

  // Validate pagination info shape
  TestValidator.predicate(
    "pagination fields exist",
    typeof defaultPage.pagination.current === "number" &&
      typeof defaultPage.pagination.limit === "number" &&
      typeof defaultPage.pagination.records === "number" &&
      typeof defaultPage.pagination.pages === "number",
  );
  // Validate data - each item has all summary fields
  defaultPage.data.forEach((setting) => {
    TestValidator.predicate(
      "id is UUID",
      typeof setting.id === "string" && setting.id.length === 36,
    );
    TestValidator.predicate("setting_key exists", !!setting.setting_key);
    TestValidator.predicate("type exists", !!setting.type);
    TestValidator.predicate(
      "is_active is boolean",
      typeof setting.is_active === "boolean",
    );
    TestValidator.predicate(
      "created_at is string",
      typeof setting.created_at === "string",
    );
    TestValidator.predicate(
      "updated_at is string",
      typeof setting.updated_at === "string",
    );
  });

  // 3. Search and filter tests (if any settings exist)
  if (defaultPage.data.length > 0) {
    const sample = RandomGenerator.pick(defaultPage.data);

    // Search by partial setting_key
    if (sample.setting_key.length > 2) {
      const partialKey = sample.setting_key.slice(0, 2);
      const reqSearch = {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        setting_key: partialKey,
      } satisfies ICommunityPlatformSettings.IRequest;
      const searchPage =
        await api.functional.communityPlatform.admin.settings.index(
          connection,
          { body: reqSearch },
        );
      typia.assert(searchPage);
      TestValidator.predicate(
        "search returns results with setting_key containing partialKey",
        searchPage.data.every((s) => s.setting_key.includes(partialKey)),
      );
    }

    // Filter by type
    if (sample.type) {
      const reqType = {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        type: sample.type,
      } satisfies ICommunityPlatformSettings.IRequest;
      const typePage =
        await api.functional.communityPlatform.admin.settings.index(
          connection,
          { body: reqType },
        );
      typia.assert(typePage);
      TestValidator.predicate(
        "type filter matches sample type",
        typePage.data.every((s) => s.type === sample.type),
      );
    }

    // Filter by is_active
    const reqActive = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      is_active: sample.is_active,
    } satisfies ICommunityPlatformSettings.IRequest;
    const activePage =
      await api.functional.communityPlatform.admin.settings.index(connection, {
        body: reqActive,
      });
    typia.assert(activePage);
    TestValidator.predicate(
      "is_active filter",
      activePage.data.every((s) => s.is_active === sample.is_active),
    );

    // Sort by setting_key ascending/descending
    for (const sort_direction of ["asc", "desc"] as const) {
      const reqSortKey = {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sort_by: "setting_key",
        sort_direction,
      } satisfies ICommunityPlatformSettings.IRequest;
      const sortPage =
        await api.functional.communityPlatform.admin.settings.index(
          connection,
          { body: reqSortKey },
        );
      typia.assert(sortPage);
      const keys = sortPage.data.map((s) => s.setting_key);
      // Check sort direction
      const sorted =
        sort_direction === "asc"
          ? [...keys].sort()
          : [...keys].sort().reverse();
      TestValidator.equals(
        `sort by setting_key ${sort_direction}`,
        keys,
        sorted,
      );
    }

    // Sort by type asc/desc
    for (const sort_direction of ["asc", "desc"] as const) {
      const reqSortType = {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sort_by: "type",
        sort_direction,
      } satisfies ICommunityPlatformSettings.IRequest;
      const sortPage =
        await api.functional.communityPlatform.admin.settings.index(
          connection,
          { body: reqSortType },
        );
      typia.assert(sortPage);
      const types = sortPage.data.map((s) => s.type);
      const sorted =
        sort_direction === "asc"
          ? [...types].sort()
          : [...types].sort().reverse();
      TestValidator.equals(`sort by type ${sort_direction}`, types, sorted);
    }

    // Sort by is_active asc/desc
    for (const sort_direction of ["asc", "desc"] as const) {
      const reqSortActive = {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sort_by: "is_active",
        sort_direction,
      } satisfies ICommunityPlatformSettings.IRequest;
      const sortPage =
        await api.functional.communityPlatform.admin.settings.index(
          connection,
          { body: reqSortActive },
        );
      typia.assert(sortPage);
      const values = sortPage.data.map((s) => s.is_active);
      const sorted =
        sort_direction === "asc"
          ? [...values].sort((a, b) => (a === b ? 0 : a ? 1 : -1))
          : [...values].sort((a, b) => (a === b ? 0 : a ? -1 : 1));
      TestValidator.equals(
        `sort by is_active ${sort_direction}`,
        values,
        sorted,
      );
    }
  }

  // 4. Test unauthenticated access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is denied", async () => {
    await api.functional.communityPlatform.admin.settings.index(unauthConn, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ICommunityPlatformSettings.IRequest,
    });
  });
}
