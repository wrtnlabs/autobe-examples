import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardCommentMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMetrics";
import type { IDiscussionBoardCommentMetricsByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMetricsByDay";
import type { IDiscussionBoardCommentMetricsStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMetricsStatus";
export async function test_api_comment_metrics_public_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const metrics: IDiscussionBoardCommentMetrics =
    await api.functional.discussionBoard.analytics.comments.metrics.index(
      connection,
    );
  typia.assert(metrics);
}
