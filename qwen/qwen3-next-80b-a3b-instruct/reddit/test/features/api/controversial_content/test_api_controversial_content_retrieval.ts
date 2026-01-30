import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsPostControversialScores } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostControversialScores";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPostControversialScores } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPostControversialScores";
export async function test_api_controversial_content_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const response: IPageICommunityBbsPostControversialScores =
    await api.functional.communityBbs.content.controversial.index(connection);
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array structure
  // No need to validate data.length > 0; it could legitimately be empty
  // Validate sorting order - controversy scores should be in descending order
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      "posts sorted by controversy score descending",
      response.data[i].controversyScore >=
        response.data[i + 1].controversyScore,
    );
  }
}
