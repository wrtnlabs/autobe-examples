import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticleTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTrends";
export async function test_api_article_trend_analysis(
  connection: api.IConnection,
): Promise<void> {
  const trends: IDiscussionBoardArticleTrends =
    await api.functional.discussionBoard.analytics.articles.trends.index(
      connection,
    );
  typia.assert(trends);
  // Validate required fields with correct data types
  TestValidator.equals(
    "time_period is one of 'day', 'week', or 'month'",
    trends.time_period,
    RandomGenerator.pick(["day", "week", "month"] as const),
  );
  TestValidator.predicate(
    "start_date is valid date-time format",
    (trends.start_date as string).match(
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i,
    ) !== null,
  );
  TestValidator.predicate(
    "end_date is valid date-time format",
    (trends.end_date as string).match(
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i,
    ) !== null,
  );
  TestValidator.predicate(
    "article_count is a non-negative integer",
    Number.isInteger(trends.article_count) && trends.article_count >= 0,
  );
  TestValidator.predicate(
    "percentage_change is a number",
    typeof trends.percentage_change === "number",
  );
  TestValidator.equals(
    "trend is one of 'up', 'down', or 'stable'",
    trends.trend,
    RandomGenerator.pick(["up", "down", "stable"] as const),
  );
  TestValidator.predicate(
    "cumulative_count is a non-negative integer",
    Number.isInteger(trends.cumulative_count) && trends.cumulative_count >= 0,
  );
}
