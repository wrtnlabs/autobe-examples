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

/**
 * Validate admin legal hold search by time range, external references and
 * active flag.
 *
 * Business goal: legal/compliance staff must be able to retrieve legal holds
 * tied to external case identifiers within a time window, optionally restricted
 * to only currently active holds, ordered by creation time.
 *
 * Flow:
 *
 * 1. Join an admin account using POST /auth/admin/join so that subsequent
 *    shoppingMall.admin.* calls are authorized.
 * 2. Create multiple legal holds via POST /shoppingMall/admin/legalHolds with
 *    distinct `external_reference` values and different `created_at` timestamps
 *    (we cannot control created_at directly from the API, so we simulate time
 *    separation by using RandomGenerator.date and relying on sequential
 *    creation order; the search itself will filter on the stored created_at).
 * 3. For at least one legal hold sharing an external_reference with others, call
 *    PUT /shoppingMall/admin/legalHolds/{legalHoldCode} to move it to a
 *    different lifecycle status (e.g. "released") and set a `released_at`
 *    timestamp, while keeping its `external_reference` unchanged.
 * 4. Call PATCH /shoppingMall/admin/adminSearch/legalHolds with a
 *    IShoppingMallLegalHold.IRequest body that:
 *
 *    - Sets `external_references` to a list containing one of the known
 *         external_reference strings,
 *    - Constrains `created_from`/`created_to` so only a subset of created holds
 *         falls into the window,
 *    - Sets `order_by` to "created_at" and `order_direction` to "desc",
 *    - Sets `page` and `limit` to fetch all matching rows in a single page.
 * 5. Assert that every element in the response page has an `external_reference`
 *    equal to one of the requested values, and its `created_at` lies within the
 *    requested time range. Also confirm that the `created_at` sequence is
 *    sorted in descending order.
 * 6. Perform a second search using the same external_reference filter but with
 *    `is_active` set such that only non-released (or only released) holds are
 *    returned, and confirm via the `status` field that the active-flag
 *    semantics are respected by the search implementation.
 */
export async function test_api_admin_legal_hold_search_time_and_external_reference_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authorized context for subsequent calls.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create multiple legal holds with distinct external_reference values.
  const baseNow = new Date();
  const externalRefA = `CASE-${RandomGenerator.alphaNumeric(8)}`;
  const externalRefB = `CASE-${RandomGenerator.alphaNumeric(8)}`;

  const createHold = async (
    codeSuffix: string,
    externalRef: string | null,
    status: string,
    effectiveShiftMs: number,
  ): Promise<IShoppingMallLegalHold> => {
    const effectiveFromDate = new Date(baseNow.getTime() + effectiveShiftMs);
    const body = {
      code: `LH-${codeSuffix}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status,
      scope_description: RandomGenerator.paragraph({ sentences: 4 }),
      external_reference: externalRef,
      effective_from: effectiveFromDate.toISOString(),
    } satisfies IShoppingMallLegalHold.ICreate;

    const created = await api.functional.shoppingMall.admin.legalHolds.create(
      connection,
      {
        body,
      },
    );
    typia.assert(created);
    return created;
  };

  // Create three holds for externalRefA at slightly offset times
  const holdA1 = await createHold("A1", externalRefA, "active", -5 * 60 * 1000);
  const holdA2 = await createHold("A2", externalRefA, "active", -2 * 60 * 1000);
  const holdA3 = await createHold("A3", externalRefA, "active", 1 * 60 * 1000);

  // And two holds for externalRefB
  const holdB1 = await createHold(
    "B1",
    externalRefB,
    "active",
    -10 * 60 * 1000,
  );
  const holdB2 = await createHold("B2", externalRefB, "active", 3 * 60 * 1000);

  // 3. Update one of the A-holds to mark it as released and set released_at.
  const releasedAt = new Date(baseNow.getTime() + 2 * 60 * 1000).toISOString();
  const updateBody = {
    status: "released",
    released_at: releasedAt,
  } satisfies IShoppingMallLegalHold.IUpdate;

  const updatedA2 = await api.functional.shoppingMall.admin.legalHolds.update(
    connection,
    {
      legalHoldCode: holdA2.code,
      body: updateBody,
    },
  );
  typia.assert(updatedA2);

  // 4. First search: filter by externalRefA and a created_at window capturing
  //    only A1 and A2 (before A3).
  const windowStart = new Date(
    baseNow.getTime() - 10 * 60 * 1000,
  ).toISOString();
  const windowEnd = new Date(baseNow.getTime() + 30 * 1000).toISOString();

  const searchRequest1 = {
    external_references: [externalRefA],
    created_from: windowStart,
    created_to: windowEnd,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallLegalHold.IRequest;

  const page1: IPageIShoppingMallLegalHold.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.legalHolds.index(
      connection,
      {
        body: searchRequest1,
      },
    );
  typia.assert(page1);

  // Validate that all returned records match the external reference filter and
  // fall within the created_at window, and that ordering is descending.
  const data1 = page1.data;

  TestValidator.predicate(
    "search1 returns only holds with requested external_reference",
    () =>
      data1.every((summary) => {
        // We cannot see external_reference directly on the summary type, but
        // we know the search engine uses external_reference filter, so at
        // minimum we ensure all ids belong to one of our created holds with
        // externalRefA.
        const idsForA = [holdA1.id, holdA2.id, holdA3.id];
        return idsForA.includes(summary.id);
      }),
  );

  TestValidator.predicate(
    "search1 created_at lies within requested window",
    () =>
      data1.every(
        (summary) =>
          summary.created_at >= windowStart && summary.created_at <= windowEnd,
      ),
  );

  TestValidator.predicate(
    "search1 results are ordered by created_at desc",
    () => {
      for (let i = 1; i < data1.length; i++) {
        if (data1[i - 1].created_at < data1[i].created_at) return false;
      }
      return true;
    },
  );

  // 5. Second search: Same external reference, but filter by is_active to
  //    exclude the released hold.
  const searchRequest2 = {
    external_references: [externalRefA],
    created_from: windowStart,
    created_to: windowEnd,
    is_active: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallLegalHold.IRequest;

  const page2: IPageIShoppingMallLegalHold.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.legalHolds.index(
      connection,
      {
        body: searchRequest2,
      },
    );
  typia.assert(page2);

  const data2 = page2.data;

  // Ensure none of the returned summaries corresponds to the released holdA2
  TestValidator.predicate(
    "search2 excludes released hold when is_active=true",
    () => data2.every((summary) => summary.id !== updatedA2.id),
  );

  // Also check that all returned summaries still belong to our A-holds set.
  TestValidator.predicate("search2 returns only holds for externalRefA", () => {
    const idsForA = [holdA1.id, holdA2.id, holdA3.id];
    return data2.every((summary) => idsForA.includes(summary.id));
  });
}
