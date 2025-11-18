import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLegalHold";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

export async function test_api_legal_hold_search_by_status_and_date_range(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Password!1" as string & tags.Format<"password">,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminId = adminAuthorized.id;
  const adminSummary = adminAuthorized.admin;

  // 2. Create several legal holds with varying statuses and creation times
  const createdHolds: IShoppingMallLegalHold[] = [];

  // Helper to create a legal hold with given status and code suffix
  const createHold = async (status: string, codeSuffix: string) => {
    const body = {
      code: `LH-${RandomGenerator.alphaNumeric(6)}-${codeSuffix}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status,
      scope_description: RandomGenerator.paragraph({ sentences: 4 }),
      external_reference: RandomGenerator.alphaNumeric(10),
      effective_from: null,
    } satisfies IShoppingMallLegalHold.ICreate;

    const hold = await api.functional.shoppingMall.admin.legalHolds.create(
      connection,
      { body },
    );
    typia.assert<IShoppingMallLegalHold>(hold);
    createdHolds.push(hold);
    return hold;
  };

  // Create active holds (some to be inside range, some outside)
  const activeHold1 = await createHold("active", "A1");
  // Ensure some time gap between creations
  const pause = async (ms: number) =>
    await new Promise<void>((resolve) => setTimeout(resolve, ms));

  await pause(10);
  const activeHold2 = await createHold("active", "A2");
  await pause(10);
  const activeHold3 = await createHold("active", "A3");

  // Create non-active holds
  await pause(10);
  const releasedHold1 = await createHold("released", "R1");
  await pause(10);
  const releasedHold2 = await createHold("released", "R2");

  // 3. Choose a date range that includes only some of the active holds
  // Sort by created_at ascending to derive ranges deterministically
  const sortedByCreatedAt = [...createdHolds].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  // We will pick a range that includes only activeHold2 and activeHold3,
  // assuming created_at roughly follows creation order.
  const from = sortedByCreatedAt[1].created_at;
  const to = sortedByCreatedAt[sortedByCreatedAt.length - 1].created_at;

  const requestBody: IShoppingMallLegalHold.IRequest = {
    statuses: ["active"],
    created_from: from,
    created_to: to,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "desc",
  };

  // 4. Call search endpoint
  const pageResult = await api.functional.shoppingMall.admin.legalHolds.index(
    connection,
    {
      body: requestBody,
    },
  );
  typia.assert<IPageIShoppingMallLegalHold.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 5. Validate pagination reflects requested page and limit
  TestValidator.equals(
    "pagination current page equals requested page",
    pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    pagination.limit,
    requestBody.limit,
  );

  // 6. Filter created holds according to our criteria to compute expectation
  const expectedActiveHolds = createdHolds.filter((h) => {
    const inStatus = h.status === "active";
    const inRange = h.created_at >= from && h.created_at <= to;
    return inStatus && inRange;
  });

  // 7. Assert record counts consistency: data length should be <= limit and
  // match the number of matching active holds (since we picked limit high)
  TestValidator.predicate(
    "data length not exceed requested limit",
    data.length <= (requestBody.limit ?? 0),
  );

  TestValidator.equals(
    "number of returned records equals expected active holds",
    data.length,
    expectedActiveHolds.length,
  );

  // 8. Validate each record in response
  for (const summary of data) {
    // Status must be active
    TestValidator.equals(
      "summary status should be active",
      summary.status,
      "active",
    );

    // created_at within range
    TestValidator.predicate(
      "summary created_at within requested range",
      summary.created_at >= from && summary.created_at <= to,
    );

    // created_by_admin_id matches joined admin
    TestValidator.equals(
      "summary created_by_admin_id should equal admin id",
      summary.created_by_admin_id,
      adminId,
    );

    if (adminSummary) {
      // created_by_admin summary should match admin summary
      TestValidator.predicate(
        "summary.created_by_admin is defined when admin summary exists",
        summary.created_by_admin !== undefined &&
          summary.created_by_admin !== null,
      );

      if (summary.created_by_admin) {
        TestValidator.equals(
          "summary.created_by_admin.id matches admin id",
          summary.created_by_admin.id,
          adminSummary.id,
        );
        TestValidator.equals(
          "summary.created_by_admin.email matches admin email",
          summary.created_by_admin.email,
          adminSummary.email,
        );
      }
    }

    // Ensure that non-active or out-of-range holds are excluded implicitly by
    // checking that every returned id is from expectedActiveHolds
    const found = expectedActiveHolds.find((h) => h.id === summary.id);
    TestValidator.predicate(
      "returned summary id should be one of expected active holds",
      found !== undefined,
    );
  }

  // 9. Ensure that known non-active holds are not in results
  const nonActiveIds = [releasedHold1.id, releasedHold2.id];
  for (const id of nonActiveIds) {
    const exists = data.some((summary) => summary.id === id);
    TestValidator.predicate(
      "non-active hold should not appear in filtered results",
      exists === false,
    );
  }
}
