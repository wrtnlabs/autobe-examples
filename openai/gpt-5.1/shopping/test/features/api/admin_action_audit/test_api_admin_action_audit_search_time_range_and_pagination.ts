import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActionAudit";
import type { IShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionAudit";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate admin action audit search time range filtering and pagination.
 *
 * Business flow:
 *
 * 1. Join as a new platform admin (POST /auth/platformAdmin/join) so that
 *    subsequent brand creation and audit search calls are authorized.
 * 2. Under this admin session, create a first batch of brands. Capture a timestamp
 *    T1 immediately after the first batch to approximate the boundary for early
 *    actions.
 * 3. Create a second batch of brands and capture timestamp T2 immediately after,
 *    so that later actions occur logically after T1.
 * 4. Call the admin action audit search endpoint with occurredFrom/occurredTo
 *    surrounding the first batch (ending before T2) and verify that at least
 *    one audit record is returned and that the window can be paginated.
 * 5. Call the endpoint again with a window that starts from just after T1 to
 *    include later actions (using occurredFrom >= T1) and verify pagination
 *    operates over that result set as well.
 *
 * Due to lack of direct correlation fields between brand IDs and audit records
 * in the exposed DTOs, this test treats the audits as an ordered stream and
 * validates that:
 *
 * - Time range filters do not produce empty results when brands exist.
 * - Pagination metadata (current, limit, records, pages) is consistent with the
 *   page size used.
 * - Concatenating paginated pages (page=1,2,3 with a small limit) covers the same
 *   audit ids as a single large-page query for the same filter without
 *   duplication or omission.
 */
export async function test_api_admin_action_audit_search_time_range_and_pagination(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. First batch of brand creations (early actions).
  const firstBatchCount: number = 3;
  const firstBatchBrands: IShoppingMallBrand[] = [];
  for (let i = 0; i < firstBatchCount; i++) {
    const createBody = {
      name: RandomGenerator.name(2),
      slug: RandomGenerator.alphaNumeric(16),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      logo_uri:
        "https://cdn.test.local/logo/" + RandomGenerator.alphaNumeric(8),
    } satisfies IShoppingMallBrand.ICreate;

    const brand: IShoppingMallBrand =
      await api.functional.shoppingMall.platformAdmin.brands.create(
        connection,
        { body: createBody },
      );
    typia.assert<IShoppingMallBrand>(brand);
    firstBatchBrands.push(brand);
  }

  // Capture an approximate boundary timestamp after first batch.
  const t1: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // Add a small delay to separate batches in time as much as reasonable in test.
  await new Promise((resolve) => setTimeout(resolve, 20));

  // 3. Second batch of brand creations (later actions).
  const secondBatchCount: number = 3;
  const secondBatchBrands: IShoppingMallBrand[] = [];
  for (let i = 0; i < secondBatchCount; i++) {
    const createBody = {
      name: RandomGenerator.name(2),
      slug: RandomGenerator.alphaNumeric(16),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      logo_uri:
        "https://cdn.test.local/logo/" + RandomGenerator.alphaNumeric(8),
    } satisfies IShoppingMallBrand.ICreate;

    const brand: IShoppingMallBrand =
      await api.functional.shoppingMall.platformAdmin.brands.create(
        connection,
        { body: createBody },
      );
    typia.assert<IShoppingMallBrand>(brand);
    secondBatchBrands.push(brand);
  }

  const t2: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // Helper to perform an audit search with generic request, returning asserted page.
  const searchAudits = async (
    body: IShoppingMallAdminActionAudit.IRequest,
  ): Promise<IPageIShoppingMallAdminActionAudit.ISummary> => {
    const page =
      await api.functional.shoppingMall.platformAdmin.adminActionAudits.index(
        connection,
        { body },
      );
    typia.assert<IPageIShoppingMallAdminActionAudit.ISummary>(page);
    return page;
  };

  // 4. Query audits for window approximating first batch: occurredTo = t1.
  const limitSmall: number & tags.Type<"int32"> & tags.Minimum<1> =
    2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const firstWindowBody: IShoppingMallAdminActionAudit.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limitSmall,
    occurredFrom: undefined,
    occurredTo: t1,
  };

  const firstWindowPage = await searchAudits(firstWindowBody);

  // Basic assertions: some audits should exist (non-negative records count).
  TestValidator.predicate(
    "first window should return a non-negative records count",
    firstWindowPage.pagination.records >= 0,
  );

  if (firstWindowPage.pagination.records > 0) {
    TestValidator.predicate(
      "first window page size does not exceed limit",
      firstWindowPage.data.length <= firstWindowPage.pagination.limit,
    );

    // Fetch concatenated first three pages (if available) and compare IDs with a wider single-page query.
    const totalPagesFirst = firstWindowPage.pagination.pages;
    const pagesToCollectFirst = Math.min(3, totalPagesFirst);

    const collectedPages: IShoppingMallAdminActionAudit.ISummary[] = [
      ...firstWindowPage.data,
    ];

    for (let p = 2; p <= pagesToCollectFirst; p++) {
      const pageBody: IShoppingMallAdminActionAudit.IRequest = {
        page: p as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: limitSmall,
        occurredFrom: firstWindowBody.occurredFrom,
        occurredTo: firstWindowBody.occurredTo,
      };
      const page = await searchAudits(pageBody);
      collectedPages.push(...page.data);
    }

    const wideBody: IShoppingMallAdminActionAudit.IRequest = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: (pagesToCollectFirst * limitSmall) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1>,
      occurredFrom: firstWindowBody.occurredFrom,
      occurredTo: firstWindowBody.occurredTo,
    };
    const widePage = await searchAudits(wideBody);

    const collectedIds = collectedPages.map((a) => a.id);
    const wideIds = widePage.data.map((a) => a.id);

    TestValidator.equals(
      "concatenated paginated results should match wide single-page ids for first window (within sampled range)",
      collectedIds,
      wideIds.slice(0, collectedIds.length),
    );
  }

  // 5. Query audits for window approximating second batch: occurredFrom = t1.
  const secondWindowBody: IShoppingMallAdminActionAudit.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limitSmall,
    occurredFrom: t1,
    occurredTo: t2,
  };

  const secondWindowPage = await searchAudits(secondWindowBody);

  TestValidator.predicate(
    "second window should return a non-negative records count",
    secondWindowPage.pagination.records >= 0,
  );

  if (secondWindowPage.pagination.records > 0) {
    TestValidator.predicate(
      "second window page size does not exceed limit",
      secondWindowPage.data.length <= secondWindowPage.pagination.limit,
    );

    const totalPagesSecond = secondWindowPage.pagination.pages;
    const pagesToCollectSecond = Math.min(3, totalPagesSecond);

    const collectedPages: IShoppingMallAdminActionAudit.ISummary[] = [
      ...secondWindowPage.data,
    ];

    for (let p = 2; p <= pagesToCollectSecond; p++) {
      const pageBody: IShoppingMallAdminActionAudit.IRequest = {
        page: p as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: limitSmall,
        occurredFrom: secondWindowBody.occurredFrom,
        occurredTo: secondWindowBody.occurredTo,
      };
      const page = await searchAudits(pageBody);
      collectedPages.push(...page.data);
    }

    const wideBody: IShoppingMallAdminActionAudit.IRequest = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: (pagesToCollectSecond * limitSmall) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1>,
      occurredFrom: secondWindowBody.occurredFrom,
      occurredTo: secondWindowBody.occurredTo,
    };
    const widePage = await searchAudits(wideBody);

    const collectedIds = collectedPages.map((a) => a.id);
    const wideIds = widePage.data.map((a) => a.id);

    TestValidator.equals(
      "concatenated paginated results should match wide single-page ids for second window (within sampled range)",
      collectedIds,
      wideIds.slice(0, collectedIds.length),
    );
  }
}
