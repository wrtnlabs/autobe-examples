import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_account_risk_flags_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminId: string & tags.Format<"uuid"> = adminAuthorized.id;

  // 2. Seed multiple risk flags for actor_type "admin"
  const limit: number & tags.Type<"int32"> & tags.Minimum<1> = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const seedCount: number = 12;

  const severities = ["low", "medium", "high", "critical"] as const;

  for (let i = 0; i < seedCount; ++i) {
    const codeIndex = (i + 1).toString().padStart(3, "0");
    const createBody = {
      actor_type: "admin",
      code: `CODE_${codeIndex}`,
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      severity: RandomGenerator.pick(severities),
      active: true,
      expires_at: undefined,
    } satisfies IShoppingMallAccountRiskFlag.ICreate;

    const createdFlag: IShoppingMallAccountRiskFlag =
      await api.functional.shoppingMall.admin.accountRiskFlags.create(
        connection,
        { body: createBody },
      );
    typia.assert<IShoppingMallAccountRiskFlag>(createdFlag);
  }

  // Helper to build request bodies
  const buildRequestBody = (
    page: number & tags.Type<"int32"> & tags.Minimum<1>,
  ): IShoppingMallAccountRiskFlag.IRequest => {
    const body = {
      page,
      limit,
      order_by: "created_at",
      order_direction: "asc",
      actor_type: "admin",
    } satisfies IShoppingMallAccountRiskFlag.IRequest;
    return body;
  };

  // 3. Call index for page 1
  const page1Body: IShoppingMallAccountRiskFlag.IRequest = buildRequestBody(
    1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  );

  const page1: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.admins.accountRiskFlags.index(
      connection,
      {
        adminId,
        body: page1Body,
      },
    );
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(page1);

  const pagination1: IPage.IPagination = page1.pagination;

  TestValidator.equals(
    "page 1 current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should equal requested limit",
    pagination1.limit,
    limit,
  );
  TestValidator.predicate(
    "page 1 data length should not exceed limit",
    page1.data.length <= pagination1.limit,
  );

  const page1Ids: string[] = page1.data.map((item) => item.id);
  const page1Times: number[] = page1.data.map((item) =>
    new Date(item.created_at).getTime(),
  );

  // 4. Call index for page 2 with same sorting
  const page2Body: IShoppingMallAccountRiskFlag.IRequest = buildRequestBody(
    2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  );

  const page2: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.admins.accountRiskFlags.index(
      connection,
      {
        adminId,
        body: page2Body,
      },
    );
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(page2);

  const pagination2: IPage.IPagination = page2.pagination;

  TestValidator.equals(
    "page 2 current page should be 2",
    pagination2.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit should equal requested limit",
    pagination2.limit,
    limit,
  );
  TestValidator.predicate(
    "page 2 data length should not exceed limit",
    page2.data.length <= pagination2.limit,
  );

  const page2Ids: string[] = page2.data.map((item) => item.id);
  const page2Times: number[] = page2.data.map((item) =>
    new Date(item.created_at).getTime(),
  );

  // 5. Pagination consistency across pages (use first page's pagination)
  TestValidator.predicate(
    "total records should be at least the sum of page1 and page2 lengths",
    pagination1.records >= page1.data.length + page2.data.length,
  );

  TestValidator.predicate(
    "total records should not exceed pages * limit",
    pagination1.records <= pagination1.pages * pagination1.limit,
  );

  // 6. Ordering validation across page1 and page2
  const allTimes: number[] = [...page1Times, ...page2Times];
  if (allTimes.length >= 2) {
    let isNonDecreasing = true;
    let hasDifference = false;
    for (let i = 1; i < allTimes.length; ++i) {
      if (allTimes[i - 1] > allTimes[i]) {
        isNonDecreasing = false;
        break;
      }
      if (allTimes[i - 1] !== allTimes[i]) {
        hasDifference = true;
      }
    }

    TestValidator.predicate(
      "created_at should be non-decreasing across pages",
      isNonDecreasing,
    );
    TestValidator.predicate(
      "there should be at least one differing created_at when multiple records exist",
      hasDifference,
    );
  }

  // 7. Disjointness between page1 and page2 when enough records exist
  if (pagination1.records >= limit * 2) {
    const page1Set = new Set(page1Ids);
    for (const id of page2Ids) {
      TestValidator.predicate(
        "page 1 and page 2 should not share risk flag ids when there are at least two full pages",
        !page1Set.has(id),
      );
    }
  }
}
