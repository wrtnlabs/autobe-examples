import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticleSnapshotTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleSnapshotTag";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticleSnapshotTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleSnapshotTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_article_snapshot_tags_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizen);
  // Use a random UUID as the snapshot ID since we cannot create actual snapshots
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Call the only available endpoint: retrieve tags for a snapshot
  const tagsResponse =
    await api.functional.economicBoard.article_snapshots.tags.index(
      citizenConnection,
      {
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 50,
        } satisfies IEconomicBoardArticleSnapshotTag.IRequest,
      },
    );
  typia.assert(tagsResponse);
  // Validate response structure matches the expected IPageIEconomicBoardArticleSnapshotTag.ISummary type
  TestValidator.predicate(
    "pagination exists",
    typeof tagsResponse.pagination === "object",
  );
  TestValidator.equals(
    "pagination current is number",
    typeof tagsResponse.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof tagsResponse.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is number",
    typeof tagsResponse.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof tagsResponse.pagination.pages,
    "number",
  );
  TestValidator.predicate("data is array", Array.isArray(tagsResponse.data));
  // Validate pagination properties are non-negative
  TestValidator.predicate(
    "current page >= 0",
    tagsResponse.pagination.current >= 0,
  );
  TestValidator.predicate("limit >= 0", tagsResponse.pagination.limit >= 0);
  TestValidator.predicate("records >= 0", tagsResponse.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", tagsResponse.pagination.pages >= 0);
  // Validate data array structure
  for (const item of tagsResponse.data) {
    TestValidator.predicate("tag is string", typeof item.tag === "string");
    TestValidator.predicate("tag length >= 1", item.tag.length >= 1);
    TestValidator.predicate("tag length <= 50", item.tag.length <= 50);
    TestValidator.predicate(
      "created_at is ISO timestamp",
      new Date(item.created_at).toISOString() === item.created_at,
    );
  }
}
