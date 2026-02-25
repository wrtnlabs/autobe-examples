import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_snapshot_attachments_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a random valid snapshot ID (UUID)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Test pagination with valid limits
  const page1 =
    await api.functional.economicBoard.article_snapshots.attachments.index(
      adminConnection,
      { snapshotId, body: { page: 1, limit: 5 } },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is positive",
    page1.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is between 1 and 100",
    page1.pagination.limit >= 1 && page1.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page1.pagination.pages >= 0,
  );
  // Test page 2 with same limit
  const page2 =
    await api.functional.economicBoard.article_snapshots.attachments.index(
      adminConnection,
      { snapshotId, body: { page: 2, limit: 5 } },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current page is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 5", page2.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 records matches page 1 records",
    page2.pagination.records === page1.pagination.records,
  );
  // Test invalid values
  // page=0 should default to 1
  const page0 =
    await api.functional.economicBoard.article_snapshots.attachments.index(
      adminConnection,
      { snapshotId, body: { page: 0, limit: 5 } },
    );
  typia.assert(page0);
  TestValidator.equals("page 0 defaults to 1", page0.pagination.current, 1);
  // limit=0 should default to 10
  const limit0 =
    await api.functional.economicBoard.article_snapshots.attachments.index(
      adminConnection,
      { snapshotId, body: { page: 1, limit: 0 } },
    );
  typia.assert(limit0);
  TestValidator.equals("limit 0 defaults to 10", limit0.pagination.limit, 10);
  // limit=101 should cap at 100
  const limit101 =
    await api.functional.economicBoard.article_snapshots.attachments.index(
      adminConnection,
      { snapshotId, body: { page: 1, limit: 101 } },
    );
  typia.assert(limit101);
  TestValidator.equals(
    "limit 101 capped at 100",
    limit101.pagination.limit,
    100,
  );
}
