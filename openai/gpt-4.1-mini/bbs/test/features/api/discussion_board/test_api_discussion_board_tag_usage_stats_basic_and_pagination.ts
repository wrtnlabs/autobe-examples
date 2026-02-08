import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMvTagUsageStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_tag_usage_stats_basic_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Basic retrieval of tag usage statistics without filters.
  {
    const body = {} satisfies IDiscussionBoardMvTagUsageStat.IRequest;
    const output = await api.functional.discussionBoard.tag_usage_stats.index(
      connection,
      { body },
    );
    typia.assert(output);
    TestValidator.predicate(
      "pagination current page is greater or equal to 1",
      output.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit is greater or equal to 1",
      output.pagination.limit >= 1,
    );
    TestValidator.predicate(
      "pagination records is greater or equal to 0",
      output.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is greater or equal to 0",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "data list is an array",
      Array.isArray(output.data),
    );
  }
  // Scenario 2: Pagination behavior for tag usage statistics retrieval.
  {
    const body = {
      page: 2,
      limit: 10,
    } satisfies IDiscussionBoardMvTagUsageStat.IRequest;
    const output = await api.functional.discussionBoard.tag_usage_stats.index(
      connection,
      { body },
    );
    typia.assert(output);
    TestValidator.equals(
      "pagination current page",
      output.pagination.current,
      2,
    );
    TestValidator.equals("pagination limit", output.pagination.limit, 10);
    TestValidator.predicate(
      "pagination pages is greater or equal to current page",
      output.pagination.pages >= output.pagination.current,
    );
    TestValidator.predicate(
      "records count is greater or equal to data length",
      output.pagination.records >= output.data.length,
    );
  }
  // Scenario 3: Access control check (even though authorizationActor is null in specs).
  {
    const body = {} satisfies IDiscussionBoardMvTagUsageStat.IRequest;
    const output = await api.functional.discussionBoard.tag_usage_stats.index(
      connection,
      { body },
    );
    typia.assert(output);
    TestValidator.predicate(
      "pagination current page is greater or equal to 1",
      output.pagination.current >= 1,
    );
    TestValidator.predicate(
      "data list is an array",
      Array.isArray(output.data),
    );
  }
}
