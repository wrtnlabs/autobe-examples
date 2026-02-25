import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleSnapshot";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_article_snapshots_access_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicBoardSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Update superAdminConnection with auth token from join result
  superAdminConnection.headers = { Authorization: superAdmin.token.access };
  // 3. Generate a random articleId (UUID) to query snapshots
  // The API endpoint accepts any UUID, even if article doesn't exist
  // Admin should be able to access snapshots (even empty) of any article
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Fetch article snapshots as super administrator with admin_delete filter
  const snapshotRequest: IEconomicBoardArticleSnapshot.IRequest = {
    snapshot_reason: "admin_delete", // Test filtering for admin deletion snapshots
    page: 1,
    limit: 20,
  };
  const snapshots = await api.functional.economicBoard.articles.snapshots.index(
    superAdminConnection,
    {
      articleId,
      body: snapshotRequest,
    },
  );
  typia.assert(snapshots);
  // 5. Validate the snapshot response structure
  TestValidator.equals(
    "pagination has correct page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has correct limit",
    snapshots.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    snapshots.pagination.pages >= 0,
  );
  // Verify that snapshots is an array (empty is valid)
  TestValidator.equals(
    "snapshots is an array",
    Array.isArray(snapshots.data),
    true,
  );
  // Check that each snapshot has correct structure (if any exist)
  for (const snapshot of snapshots.data) {
    TestValidator.equals(
      "snapshot has uuid id",
      typeof snapshot.id === "string" && snapshot.id.length === 36,
      true,
    );
    TestValidator.equals(
      "snapshot has date-time created_at",
      typeof snapshot.created_at === "string" &&
        new Date(snapshot.created_at).toISOString() === snapshot.created_at,
      true,
    );
    TestValidator.equals(
      "snapshot has valid snapshot_reason",
      ["initial", "edit", "deletion", "admin_delete"].includes(
        snapshot.snapshot_reason,
      ),
      true,
    );
    TestValidator.predicate(
      "snapshot has non-negative tagCount",
      snapshot.tagCount >= 0,
    );
    TestValidator.predicate(
      "snapshot has non-negative attachmentCount",
      snapshot.attachmentCount >= 0,
    );
  }
  // 6. Test with a broader request (no snapshot_reason filter)
  const allSnapshotsRequest: IEconomicBoardArticleSnapshot.IRequest = {
    page: 1,
    limit: 20,
  };
  const allSnapshots =
    await api.functional.economicBoard.articles.snapshots.index(
      superAdminConnection,
      {
        articleId,
        body: allSnapshotsRequest,
      },
    );
  typia.assert(allSnapshots);
  // Ensure response structure is valid
  TestValidator.equals(
    "all snapshots page is 1",
    allSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all snapshots has valid records",
    allSnapshots.pagination.records >= 0,
  );
  // 7. Test pagination with max limit
  const maxLimitRequest: IEconomicBoardArticleSnapshot.IRequest = {
    limit: 100, // Maximum allowed limit
  };
  const maxLimitSnapshots =
    await api.functional.economicBoard.articles.snapshots.index(
      superAdminConnection,
      {
        articleId,
        body: maxLimitRequest,
      },
    );
  typia.assert(maxLimitSnapshots);
  TestValidator.equals(
    "max limit respected",
    maxLimitSnapshots.pagination.limit,
    100,
  );
  // 8. Test with page=1 to ensure valid response (edge case)
  const firstPageRequest: IEconomicBoardArticleSnapshot.IRequest = {
    page: 1,
  };
  const firstPageSnapshots =
    await api.functional.economicBoard.articles.snapshots.index(
      superAdminConnection,
      {
        articleId,
        body: firstPageRequest,
      },
    );
  typia.assert(firstPageSnapshots);
  TestValidator.equals("first page", firstPageSnapshots.pagination.current, 1);
  // 9. Validate that admin can access snapshots of any article (non-existent) with proper structure
  // Since we're using a generated UUID as articleId, we're explicitly testing admin can access snapshots of any article
  // even if it doesn't exist, and the response format is correct.
  // 10. Test pagination with page > 1 and limit > 1 (but within bounds)
  const paginationRequest: IEconomicBoardArticleSnapshot.IRequest = {
    page: 2,
    limit: 10,
  };
  const paginationSnapshots =
    await api.functional.economicBoard.articles.snapshots.index(
      superAdminConnection,
      {
        articleId,
        body: paginationRequest,
      },
    );
  typia.assert(paginationSnapshots);
  TestValidator.equals(
    "second page",
    paginationSnapshots.pagination.current,
    2,
  );
  TestValidator.equals("limit 10", paginationSnapshots.pagination.limit, 10);
  // All tests pass
}
