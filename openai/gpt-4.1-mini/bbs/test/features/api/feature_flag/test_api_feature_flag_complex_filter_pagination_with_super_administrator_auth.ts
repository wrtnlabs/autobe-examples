import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_feature_flag_complex_filter_pagination_with_super_administrator_auth(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Authenticate as superAdministrator, then test complex filtering and pagination of feature flags
  // 1. Super admin join and obtain authorized connection
  const saConnection: api.IConnection = { host: connection.host };
  const saAuth = await authorize_super_administrator_join(saConnection, {
    body: {
      href: "https://test.local/path",
      referrer: "https://referrer.local",
    },
  });
  saConnection.headers = { Authorization: saAuth.token.access };
  // 2. Retrieve all feature flags without filters to establish baseline
  const allFlagsResponse =
    await api.functional.discussionBoard.superAdministrator.featureFlags.index(
      saConnection,
      { body: {} },
    );
  typia.assert(allFlagsResponse);
  const allFlags = allFlagsResponse.data;
  // 3. Pick some codes for code filter testing
  const sampleCodes =
    allFlags.length > 0
      ? allFlags
          .slice()
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(allFlags.length, 3))
          .map((f: IDiscussionBoardFeatureFlag.ISummary) => f.code)
      : [];
  // 4. Test filtering by exact code
  if (sampleCodes.length > 0) {
    for (const code of sampleCodes) {
      const resp =
        await api.functional.discussionBoard.superAdministrator.featureFlags.index(
          saConnection,
          {
            body: { code, page: 1, limit: 10, sort: "created_at" },
          },
        );
      typia.assert(resp);
      TestValidator.predicate(
        `filter by code '${code}' returns only matching code`,
        resp.data.every((flag) => flag.code === code),
      );
      TestValidator.predicate(
        "pagination current page is 1",
        resp.pagination.current === 1,
      );
      TestValidator.predicate(
        "pagination limit is 10",
        resp.pagination.limit === 10,
      );
    }
  }
  // 5. Test filtering by enabled true and false
  for (const enabled of [true, false]) {
    const resp =
      await api.functional.discussionBoard.superAdministrator.featureFlags.index(
        saConnection,
        {
          body: { enabled, page: 1, limit: 20, sort: "updated_at" },
        },
      );
    typia.assert(resp);
    TestValidator.predicate(
      `filter by enabled=${enabled} all flags enabled state match`,
      resp.data.every((flag) => flag.enabled === enabled),
    );
    TestValidator.predicate(
      "pagination current page is 1",
      resp.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit is 20",
      resp.pagination.limit === 20,
    );
  }
  // 6. Test filtering by createdAtFrom and createdAtTo
  if (allFlags.length > 0) {
    const createdAtDates = allFlags
      .map((flag) => flag.createdAt ?? null)
      .filter((dt): dt is string => dt !== null);
    if (createdAtDates.length > 1) {
      const sortedCreatedAts = [...createdAtDates].sort();
      const createdAtFrom = sortedCreatedAts[0];
      const createdAtTo = sortedCreatedAts[sortedCreatedAts.length - 1];
      const resp =
        await api.functional.discussionBoard.superAdministrator.featureFlags.index(
          saConnection,
          {
            body: {
              createdAtFrom,
              createdAtTo,
              page: 1,
              limit: 50,
              sort: "created_at",
            },
          },
        );
      typia.assert(resp);
      TestValidator.predicate(
        `all createdAt >= createdAtFrom (${createdAtFrom})`,
        resp.data.every(
          (flag) =>
            flag.createdAt !== undefined && flag.createdAt >= createdAtFrom,
        ),
      );
      TestValidator.predicate(
        `all createdAt <= createdAtTo (${createdAtTo})`,
        resp.data.every(
          (flag) =>
            flag.createdAt !== undefined && flag.createdAt <= createdAtTo,
        ),
      );
    }
  }
  // 7. Test filtering by updatedAtFrom and updatedAtTo
  if (allFlags.length > 0) {
    const updatedAtDates = allFlags
      .map((flag) => flag.updatedAt ?? null)
      .filter((dt): dt is string => dt !== null);
    if (updatedAtDates.length > 1) {
      const sortedUpdatedAts = [...updatedAtDates].sort();
      const updatedAtFrom = sortedUpdatedAts[0];
      const updatedAtTo = sortedUpdatedAts[sortedUpdatedAts.length - 1];
      const resp =
        await api.functional.discussionBoard.superAdministrator.featureFlags.index(
          saConnection,
          {
            body: {
              updatedAtFrom,
              updatedAtTo,
              page: 1,
              limit: 50,
              sort: "updated_at",
            },
          },
        );
      typia.assert(resp);
      TestValidator.predicate(
        `all updatedAt >= updatedAtFrom (${updatedAtFrom})`,
        resp.data.every(
          (flag) =>
            flag.updatedAt !== undefined && flag.updatedAt >= updatedAtFrom,
        ),
      );
      TestValidator.predicate(
        `all updatedAt <= updatedAtTo (${updatedAtTo})`,
        resp.data.every(
          (flag) =>
            flag.updatedAt !== undefined && flag.updatedAt <= updatedAtTo,
        ),
      );
    }
  }
  // 8. Test complex combined filtering: code + enabled + date ranges
  if (sampleCodes.length > 0 && allFlags.length > 0) {
    const code = sampleCodes[0];
    const enabled = true;
    const createdAtFrom = allFlags[0].createdAt ?? undefined;
    const updatedAtTo = allFlags[allFlags.length - 1].updatedAt ?? undefined;
    const resp =
      await api.functional.discussionBoard.superAdministrator.featureFlags.index(
        saConnection,
        {
          body: {
            code,
            enabled,
            createdAtFrom,
            updatedAtTo,
            page: 1,
            limit: 10,
            sort: "created_at",
          },
        },
      );
    typia.assert(resp);
    TestValidator.predicate(
      "complex filter: all flags match code",
      resp.data.every((flag) => flag.code === code),
    );
    TestValidator.predicate(
      "complex filter: all flags match enabled",
      resp.data.every((flag) => flag.enabled === enabled),
    );
  }
  // 9. Test pagination: vary page and limit
  const limit = 5;
  const totalPages = Math.ceil(allFlags.length / limit);
  if (totalPages > 1) {
    const page1 =
      await api.functional.discussionBoard.superAdministrator.featureFlags.index(
        saConnection,
        {
          body: { page: 1, limit, sort: "created_at" },
        },
      );
    const page2 =
      await api.functional.discussionBoard.superAdministrator.featureFlags.index(
        saConnection,
        {
          body: { page: 2, limit, sort: "created_at" },
        },
      );
    typia.assert(page1);
    typia.assert(page2);
    TestValidator.notEquals(
      "pagination: page 1 and page 2 have different first IDs",
      page1.data[0]?.id,
      page2.data[0]?.id,
    );
    TestValidator.equals(
      "pagination page count",
      page1.pagination.pages,
      totalPages,
    );
    TestValidator.equals(
      "pagination page limit",
      page1.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "pagination page current",
      page1.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination page current",
      page2.pagination.current === 2,
    );
  }
}
