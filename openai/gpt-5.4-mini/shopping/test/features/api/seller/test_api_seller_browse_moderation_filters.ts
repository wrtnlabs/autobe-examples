import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_browse_moderation_filters(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator seller browsing with moderation filters.
   *
   * Validates that an administrator can browse sellers using keyword search,
   * email, status, rejection reason, timestamp windows, sorting, and pagination.
   * The test also checks that rejected sellers expose rejection reasons and that
   * the result order remains stable across repeated requests for review workflows.
   *
   * 1. Register and authenticate an administrator with an isolated connection.
   * 2. Browse sellers using broad filters and capture a stable result set.
   * 3. Re-query the same page to confirm pagination metadata and ordering stability.
   * 4. Apply exact-match and range-based filters where possible and verify that
   *    every returned seller matches the requested criteria.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com` as string,
      password: "P@ssw0rd123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const broadRequest = {
    search: RandomGenerator.alphabets(3),
    page: 1,
    limit: 20,
    sort: "createdAt",
    order: "desc",
  } satisfies IMallPlatformSeller.IRequest;
  const firstPage =
    await api.functional.mallPlatform.administrator.sellers.index(
      administratorConnection,
      { body: broadRequest },
    );
  typia.assert(firstPage);
  const repeatedPage =
    await api.functional.mallPlatform.administrator.sellers.index(
      administratorConnection,
      { body: broadRequest },
    );
  typia.assert(repeatedPage);
  TestValidator.equals(
    "pagination metadata should be stable",
    firstPage.pagination,
    repeatedPage.pagination,
  );
  TestValidator.equals(
    "seller result ordering should be stable",
    firstPage.data.map((seller) => seller.id),
    repeatedPage.data.map((seller) => seller.id),
  );
  TestValidator.predicate(
    "seller summaries should expose identifiers and emails",
    firstPage.data.every(
      (seller) => seller.id.length > 0 && seller.email.length > 0,
    ),
  );
  const statusFiltered =
    await api.functional.mallPlatform.administrator.sellers.index(
      administratorConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
          sort: "createdAt",
          order: "asc",
        } satisfies IMallPlatformSeller.IRequest,
      },
    );
  typia.assert(statusFiltered);
  TestValidator.predicate(
    "status filter should keep all returned sellers in the requested state",
    statusFiltered.data.every((seller) => seller.status === "pending"),
  );
  if (firstPage.data.length > 0) {
    const exactEmailCandidate = firstPage.data[0];
    const exactEmailResult =
      await api.functional.mallPlatform.administrator.sellers.index(
        administratorConnection,
        {
          body: {
            email: exactEmailCandidate.email,
            page: 1,
            limit: 20,
            sort: "createdAt",
            order: "desc",
          } satisfies IMallPlatformSeller.IRequest,
        },
      );
    typia.assert(exactEmailResult);
    TestValidator.predicate(
      "email filter should return only the requested seller email",
      exactEmailResult.data.every(
        (seller) => seller.email === exactEmailCandidate.email,
      ),
    );
  }
  const rejectionFiltered =
    await api.functional.mallPlatform.administrator.sellers.index(
      administratorConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
          sort: "updatedAt",
          order: "desc",
        } satisfies IMallPlatformSeller.IRequest,
      },
    );
  typia.assert(rejectionFiltered);
  TestValidator.predicate(
    "rejected seller rows should include a rejection reason",
    rejectionFiltered.data.every((seller) =>
      seller.status === "rejected" ? seller.rejectionReason !== null : true,
    ),
  );
  if (rejectionFiltered.data.length > 0) {
    const rejectionReasonCandidate = rejectionFiltered.data.find(
      (seller) => seller.rejectionReason !== null,
    );
    if (
      rejectionReasonCandidate &&
      rejectionReasonCandidate.rejectionReason !== null
    ) {
      const rejectionReasonResult =
        await api.functional.mallPlatform.administrator.sellers.index(
          administratorConnection,
          {
            body: {
              status: "rejected",
              rejection_reason: rejectionReasonCandidate.rejectionReason,
              page: 1,
              limit: 20,
              sort: "updatedAt",
              order: "desc",
            } satisfies IMallPlatformSeller.IRequest,
          },
        );
      typia.assert(rejectionReasonResult);
      TestValidator.predicate(
        "rejection reason filter should keep returned sellers aligned with the requested reason",
        rejectionReasonResult.data.every(
          (seller) =>
            seller.rejectionReason === rejectionReasonCandidate.rejectionReason,
        ),
      );
    }
  }
  const createdRangeStart = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const createdRangeEnd = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const createdRangePage =
    await api.functional.mallPlatform.administrator.sellers.index(
      administratorConnection,
      {
        body: {
          created_at_from: createdRangeStart,
          created_at_to: createdRangeEnd,
          page: 1,
          limit: 20,
          sort: "createdAt",
          order: "desc",
        } satisfies IMallPlatformSeller.IRequest,
      },
    );
  typia.assert(createdRangePage);
  if (createdRangePage.data.length > 0) {
    TestValidator.predicate(
      "createdAt range filter should keep every seller within the requested interval when data exists",
      createdRangePage.data.every(
        (seller) =>
          seller.createdAt >= createdRangeStart &&
          seller.createdAt <= createdRangeEnd,
      ),
    );
  }
}
