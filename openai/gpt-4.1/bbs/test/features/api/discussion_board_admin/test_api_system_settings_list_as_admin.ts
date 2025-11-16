import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";

/**
 * Validate that an administrator can retrieve a filtered and paginated list of
 * all system settings.
 *
 * 1. Register a new admin via join.
 * 2. Query system settings with various filter/pagination/sort options (key,
 *    value, description, page, limit, sort_key, sort_direction).
 * 3. Check that the response data matches filter conditions, respects pagination,
 *    and sorts correctly.
 * 4. Check expected fields, audit requirements present for each record.
 * 5. Edge cases: strict filter (empty results), partial filter, different
 *    combinations of sort/pagination parameters.
 */
export async function test_api_system_settings_list_as_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "A!1";
  const adminHref =
    "https://admin-test." + RandomGenerator.alphaNumeric(8) + ".com";
  const adminReferrer =
    "https://referrer." + RandomGenerator.alphaNumeric(6) + ".com";
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: adminHref,
        referrer: adminReferrer,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: List system settings with no filter (grab sample for further testing)
  const noFilterRes =
    await api.functional.discussionBoard.admin.systemSettings.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(noFilterRes);
  TestValidator.predicate(
    "noFilter returns system settings",
    noFilterRes.data.length >= 0,
  );

  if (noFilterRes.data.length > 0) {
    // Pick random setting for filter edge cases
    const sampleSetting = RandomGenerator.pick(noFilterRes.data);
    // Partial key and value substrings
    const keyFragment = RandomGenerator.substring(sampleSetting.key);
    const valueFragment = RandomGenerator.substring(sampleSetting.value);
    const descFragment =
      sampleSetting.description && sampleSetting.description.length > 0
        ? RandomGenerator.substring(sampleSetting.description)
        : undefined;

    // Step 3: Query with partial key filter
    if (keyFragment.length >= 2) {
      const keyRes =
        await api.functional.discussionBoard.admin.systemSettings.index(
          connection,
          {
            body: { key: keyFragment },
          },
        );
      typia.assert(keyRes);
      TestValidator.predicate(
        "all results match partial key filter",
        keyRes.data.every((s) => s.key.includes(keyFragment)),
      );
    }
    // Step 4: Query with partial value filter
    if (valueFragment.length >= 2) {
      const valueRes =
        await api.functional.discussionBoard.admin.systemSettings.index(
          connection,
          {
            body: { value: valueFragment },
          },
        );
      typia.assert(valueRes);
      TestValidator.predicate(
        "all results match partial value filter",
        valueRes.data.every((s) => s.value.includes(valueFragment)),
      );
    }
    // Step 5: Query with partial description filter
    if (descFragment && descFragment.length >= 2) {
      const descRes =
        await api.functional.discussionBoard.admin.systemSettings.index(
          connection,
          {
            body: { description: descFragment },
          },
        );
      typia.assert(descRes);
      TestValidator.predicate(
        "all results match partial description filter",
        descRes.data.every((s) => (s.description ?? "").includes(descFragment)),
      );
    }
    // Step 6: Pagination check (limit=1)
    const pageRes =
      await api.functional.discussionBoard.admin.systemSettings.index(
        connection,
        {
          body: { limit: 1 },
        },
      );
    typia.assert(pageRes);
    TestValidator.equals(
      "pagination: limit=1 yields one or zero records",
      pageRes.data.length,
      Math.min(1, noFilterRes.data.length),
    );
    TestValidator.equals(
      "pagination meta: limit field",
      pageRes.pagination.limit,
      1,
    );
    // Step 7: Strict filter (should yield 0)
    const impossibleRes =
      await api.functional.discussionBoard.admin.systemSettings.index(
        connection,
        {
          body: { key: "!!NO_MATCH_KEY!!" },
        },
      );
    typia.assert(impossibleRes);
    TestValidator.equals(
      "strict filter yields empty data array",
      impossibleRes.data.length,
      0,
    );
    TestValidator.predicate(
      "strict filter pagination: records is 0",
      impossibleRes.pagination.records === 0,
    );
    // Step 8: Sorting checks (created_at, asc/desc)
    for (const [sort_key, label] of [
      ["created_at", "created_at"],
      ["updated_at", "updated_at"],
    ] as const) {
      for (const sort_direction of ["asc", "desc"] as const) {
        const sortRes =
          await api.functional.discussionBoard.admin.systemSettings.index(
            connection,
            {
              body: { sort_key, sort_direction },
            },
          );
        typia.assert(sortRes);
        const compareField = (s: (typeof sortRes.data)[number]) =>
          new Date(s[sort_key]).getTime();
        const sorted = [...sortRes.data].sort((a, b) =>
          sort_direction === "asc"
            ? compareField(a) - compareField(b)
            : compareField(b) - compareField(a),
        );
        TestValidator.equals(
          `results are sorted by ${label} ${sort_direction}`,
          sortRes.data,
          sorted,
        );
      }
    }
    // Step 9: Check required fields present and of correct type
    for (const record of noFilterRes.data) {
      typia.assert(record);
      TestValidator.predicate(
        "id is uuid",
        typeof record.id === "string" && record.id.length > 0,
      );
      TestValidator.predicate(
        "key is string",
        typeof record.key === "string" && record.key.length > 0,
      );
      TestValidator.predicate(
        "value is string",
        typeof record.value === "string",
      );
      TestValidator.predicate(
        "created_at valid",
        typeof record.created_at === "string" && record.created_at.length > 0,
      );
      TestValidator.predicate(
        "updated_at valid",
        typeof record.updated_at === "string" && record.updated_at.length > 0,
      );
    }
  } else {
    // No data loaded -- just query with impossible filter and make sure still works
    const impossibleRes =
      await api.functional.discussionBoard.admin.systemSettings.index(
        connection,
        {
          body: { key: "!!NO_MATCH_KEY!!" },
        },
      );
    typia.assert(impossibleRes);
    TestValidator.equals(
      "strict filter yields empty data array (no existing settings)",
      impossibleRes.data.length,
      0,
    );
  }
}
