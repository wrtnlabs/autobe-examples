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

export async function test_api_article_snapshot_attachments_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a snapshot with attachments for testing
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Make the call to retrieve attachments (unauthenticated)
  const response =
    await api.functional.economicBoard.article_snapshots.attachments.index(
      connection,
      { snapshotId, body: {} },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate that attachments are sorted by created_at in descending order
  // The API defaults to descending order, so we can validate by requesting ascending and checking the opposite
  const ascendingResponse =
    await api.functional.economicBoard.article_snapshots.attachments.index(
      connection,
      { snapshotId, body: { sort: "asc" } },
    );
  typia.assert(ascendingResponse);
  // For descending order, verify that the first created_at is >= the last created_at
  if (response.data.length > 0 && ascendingResponse.data.length > 0) {
    const firstCreated = response.data[0].created_at;
    const lastCreated = response.data[response.data.length - 1].created_at;
    const firstCreatedAscending = ascendingResponse.data[0].created_at;
    const lastCreatedAscending =
      ascendingResponse.data[ascendingResponse.data.length - 1].created_at;
    // For descending order: first element should be newest (latest date)
    // For ascending order: first element should be oldest (earliest date)
    // So first of descending should be >= last of ascending (the reverse must be true)
    TestValidator.predicate(
      "descending order: first item is >= last item",
      firstCreated >= lastCreated,
    );
    // Verify that the descending order is the reverse of ascending order
    if (response.data.length === ascendingResponse.data.length) {
      // Check if descending is exactly reversed
      for (let i = 0; i < response.data.length; i++) {
        TestValidator.equals(
          `descending[${i}] == ascending[${response.data.length - 1 - i}]`,
          response.data[i].created_at,
          ascendingResponse.data[response.data.length - 1 - i].created_at,
        );
      }
    }
  }
  // Verify prohibited fields are NOT present
  response.data.forEach((attachment) => {
    TestValidator.predicate(
      "no article_id field",
      !("article_id" in attachment),
    );
    TestValidator.predicate(
      "no snapshot_attachment_id field",
      !("snapshot_attachment_id" in attachment),
    );
  });
}
