import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_feature_flags_filtered_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Set token to headers for authenticated requests
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = admin.token.access;
  // 2. Prepare some test data by querying all flags without filters
  const allFlags =
    await api.functional.discussionBoard.administrator.featureFlags.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(allFlags);
  const flagsData = allFlags.data;
  if (flagsData.length === 0) {
    // If no flags exist, the test cannot proceed meaningfully
    // Here we just assert empty list and pagination correctness
    TestValidator.equals(
      "pagination current page",
      allFlags.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination limit positive",
      allFlags.pagination.limit > 0,
    );
    TestValidator.equals("pagination records", allFlags.pagination.records, 0);
    TestValidator.equals("pagination pages", allFlags.pagination.pages, 0);
    return;
  }
  // 3. Choose a random feature flag to test filtering by exact code
  const sampleFlag = RandomGenerator.pick(flagsData);
  // 4. Compose filter conditions: enabled status and exact code
  const enabledStatus = sampleFlag.enabled;
  const code = sampleFlag.code;
  // 5. Query filtered list by enabled and code, sorting by created_at
  const page = 1;
  const limit = 10;
  const sortedFlags = flagsData
    .filter((f) => f.enabled === enabledStatus && f.code === code)
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? "").getTime() -
        new Date(a.createdAt ?? "").getTime(),
    );
  const filteredResponse =
    await api.functional.discussionBoard.administrator.featureFlags.index(
      adminConnection,
      {
        body: {
          enabled: enabledStatus,
          code,
          page,
          limit,
          sort: "created_at",
        },
      },
    );
  typia.assert(filteredResponse);
  // 6. Validate that returned flags match the filter criteria (all enabled and code)
  filteredResponse.data.forEach((flag) => {
    typia.assert(flag);
    TestValidator.equals("flag enabled status", flag.enabled, enabledStatus);
    TestValidator.equals("flag code", flag.code, code);
    // Validate presence of required properties
    TestValidator.predicate(
      "flag has id",
      typeof flag.id === "string" && flag.id.length > 0,
    );
    TestValidator.predicate(
      "flag has name",
      typeof flag.name === "string" && flag.name.length > 0,
    );
    TestValidator.predicate(
      "flag has description",
      typeof flag.description === "string",
    );
    TestValidator.predicate(
      "flag has createdAt",
      typeof flag.createdAt === "string",
    );
    TestValidator.predicate(
      "flag has updatedAt",
      typeof flag.updatedAt === "string",
    );
  });
  // 7. Validate pagination metadata correctness
  const { pagination } = filteredResponse;
  TestValidator.predicate("pagination current >= 1", pagination.current >= 1);
  TestValidator.predicate(
    "pagination limit >= 1 and <= 100",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  // 8. Validate pagination records and pages consistent with limit
  if (pagination.records > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pagination pages consistent with records and limit",
      pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "pagination pages zero if no records",
      pagination.pages,
      0,
    );
  }
  // 9. Validate sorting by creation date descending
  for (let i = 1; i < filteredResponse.data.length; i++) {
    const prevDate = new Date(
      filteredResponse.data[i - 1].createdAt ?? "",
    ).getTime();
    const currDate = new Date(
      filteredResponse.data[i].createdAt ?? "",
    ).getTime();
    TestValidator.predicate(
      `sorted by createdAt: element ${i - 1} date >= element ${i} date`,
      prevDate >= currDate,
    );
  }
  // 10. Check that returned flags correspond to the manually filtered and sorted flags subset
  TestValidator.equals(
    "filtered flags data matches manual filtering",
    filteredResponse.data.map((f) => f.id),
    sortedFlags.slice(0, limit).map((f) => f.id),
  );
}
