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

export async function test_api_admin_customer_risk_flags_list_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Seed risk flags for customers (all actor_type="customer")
  // We'll create:
  // - Several "high" severity, active=true flags
  // - Some non-matching flags (different severity or inactive)
  // Creation times will be roughly "now", so we'll build a time window
  // around a subset of them using RandomGenerator.date.

  const now = new Date();

  type SeedRecord = {
    entity: IShoppingMallAccountRiskFlag;
    severity: string;
    active: boolean;
    createdAt: Date;
  };

  const seeds: SeedRecord[] = [];

  const createFlag = async (
    severity: string,
    active: boolean,
  ): Promise<void> => {
    const createdAtDate = RandomGenerator.date(
      new Date(now.getTime() - 1000 * 60 * 60 * 24),
      1000 * 60 * 60 * 48,
    );

    const body = {
      actor_type: "customer",
      code: RandomGenerator.alphaNumeric(12),
      reason: RandomGenerator.paragraph({ sentences: 4 }),
      severity,
      active,
      expires_at: null,
    } satisfies IShoppingMallAccountRiskFlag.ICreate;

    const entity: IShoppingMallAccountRiskFlag =
      await api.functional.shoppingMall.admin.accountRiskFlags.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallAccountRiskFlag>(entity);

    seeds.push({ entity, severity, active, createdAt: createdAtDate });
  };

  // Create flags
  await createFlag("high", true);
  await createFlag("high", true);
  await createFlag("high", true);
  await createFlag("medium", true);
  await createFlag("high", false);

  // 3. Derive a time window that includes only some of the high+active flags
  const highActive = seeds.filter((s) => s.severity === "high" && s.active);

  highActive.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const middleIndex = Math.floor(highActive.length / 2);
  const windowTarget = highActive[middleIndex];

  const createdFromDate = new Date(
    windowTarget.createdAt.getTime() - 1000 * 60 * 10,
  );
  const createdToDate = new Date(
    windowTarget.createdAt.getTime() + 1000 * 60 * 10,
  );

  // 4. Call the index endpoint for a random customerId
  const customerId = typia.random<string & tags.Format<"uuid">>();

  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "desc",
    actor_type: "customer",
    severity: "high",
    active: true,
    created_from: createdFromDate.toISOString() as string &
      tags.Format<"date-time">,
    created_to: createdToDate.toISOString() as string &
      tags.Format<"date-time">,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const pageResult: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.customers.accountRiskFlags.index(
      connection,
      {
        customerId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  const highActiveInWindow = highActive.filter((s) => {
    const t = s.createdAt.getTime();
    return t >= createdFromDate.getTime() && t <= createdToDate.getTime();
  });

  const expectedTotal = highActiveInWindow.length;
  const expectedPages =
    expectedTotal === 0 ? 0 : Math.ceil(expectedTotal / requestBody.limit);

  // 5. Verify pagination shape
  TestValidator.equals(
    "page.limit should equal requested limit",
    pagination.limit,
    requestBody.limit,
  );
  TestValidator.equals(
    "page.current should equal requested page",
    pagination.current,
    requestBody.page,
  );

  TestValidator.predicate(
    "pagination.records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    pagination.pages >= 0,
  );

  if (expectedTotal > 0) {
    TestValidator.equals(
      "pagination.records should equal expectedTotal when filters narrow to seeded subset",
      pagination.records,
      expectedTotal,
    );
    TestValidator.equals(
      "pagination.pages should equal computed expectedPages",
      pagination.pages,
      expectedPages,
    );
  }

  // 6. Verify records properties
  const data = pageResult.data;

  for (const summary of data) {
    typia.assert<IShoppingMallAccountRiskFlag.ISummary>(summary);

    TestValidator.equals(
      "summary.actor_type should be 'customer'",
      summary.actor_type,
      "customer",
    );

    TestValidator.equals(
      "summary.severity should be 'high'",
      summary.severity,
      "high",
    );

    TestValidator.equals("summary.active should be true", summary.active, true);

    const createdAt = new Date(summary.created_at);
    TestValidator.predicate(
      "summary.created_at should be within requested time window",
      createdAt.getTime() >= createdFromDate.getTime() &&
        createdAt.getTime() <= createdToDate.getTime(),
    );
  }

  // 7. Optionally, navigate to next page when we expect more than one page
  if (expectedPages >= 2) {
    const secondPageBody = {
      ...requestBody,
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallAccountRiskFlag.IRequest;

    const secondPage: IPageIShoppingMallAccountRiskFlag.ISummary =
      await api.functional.shoppingMall.admin.customers.accountRiskFlags.index(
        connection,
        {
          customerId,
          body: secondPageBody,
        },
      );
    typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(secondPage);

    const secondPagination: IPage.IPagination = secondPage.pagination;
    typia.assert<IPage.IPagination>(secondPagination);

    TestValidator.equals(
      "second page current index should be 2",
      secondPagination.current,
      secondPageBody.page,
    );

    const firstIds = pageResult.data.map((s) => s.id);
    for (const summary of secondPage.data) {
      TestValidator.predicate(
        "second page records should not duplicate first page records",
        firstIds.indexOf(summary.id) === -1,
      );
    }
  }
}
