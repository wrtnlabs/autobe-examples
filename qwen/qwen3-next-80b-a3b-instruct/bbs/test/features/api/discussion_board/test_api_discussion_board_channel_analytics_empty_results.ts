import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardChannelAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannelAnalytics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardChannelAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardChannelAnalytics";
export async function test_api_discussion_board_channel_analytics_empty_results(
  connection: api.IConnection,
): Promise<void> {
  const result: IPageIDiscussionBoardChannelAnalytics =
    await api.functional.discussionBoard.analytics.articles.channels.index(
      connection,
    );
  typia.assert(result);
  // Critical validations for empty result scenario
  TestValidator.equals(
    "pages must be 0 when no records exist",
    result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "records must be 0 when no articles exist",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "data array must be empty when no articles exist",
    result.data.length,
    0,
  );
  TestValidator.predicate(
    "current page should be at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit should be positive",
    result.pagination.limit > 0,
  );
}
