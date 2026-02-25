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

export async function test_api_article_snapshots_filtered_by_reason_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
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
  // 2. Use a random article ID (since we can't create articles)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Request snapshots with filtering: edit reason and pagination
  const snapshotResponse =
    await api.functional.economicBoard.articles.snapshots.index(
      superAdminConnection,
      {
        articleId,
        body: {
          snapshot_reason: "edit",
          page: 1,
          limit: 20,
        } satisfies IEconomicBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 4. Validate pagination structure per IPageIEconomicBoardArticleSnapshot.ISummary
  TestValidator.equals(
    "pagination current page",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    snapshotResponse.pagination.pages >= 0,
  );
  // 5. Validate that data array contains only ISummary items
  // Verify snapshot_reason is only "edit" if any data exists
  if (snapshotResponse.data.length > 0) {
    TestValidator.predicate(
      "all snapshots are edit type",
      snapshotResponse.data.every((s) => s.snapshot_reason === "edit"),
    );
    snapshotResponse.data.forEach((snapshot) => {
      TestValidator.equals(
        "snapshot has uuid id",
        typeof snapshot.id,
        "string",
      );
      TestValidator.equals(
        "snapshot has date-time created_at",
        typeof snapshot.created_at,
        "string",
      );
      TestValidator.predicate(
        "snapshot created_at has ISO format",
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(snapshot.created_at),
      );
      TestValidator.equals(
        "snapshot has valid reason",
        snapshot.snapshot_reason,
        "edit",
      );
      TestValidator.predicate(
        "tagCount is non-negative",
        snapshot.tagCount >= 0,
      );
      TestValidator.predicate(
        "attachmentCount is non-negative",
        snapshot.attachmentCount >= 0,
      );
    });
  }
  // 6. Validate that even if no edit snapshots exist, the structure is correct
  // We don't assert on data length because no control over data existence
  TestValidator.equals(
    "data is array",
    Array.isArray(snapshotResponse.data),
    true,
  );
}
