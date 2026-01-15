import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardCommentOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentOverview";
export async function test_api_comment_overview_public_access(
  connection: api.IConnection,
): Promise<void> {
  const overview: IDiscussionBoardCommentOverview =
    await api.functional.discussionBoard.dashboard.comments.overview(
      connection,
    );
  typia.assert(overview);
  TestValidator.equals(
    "total_comments is int32 type",
    typeof overview.total_comments,
    "number",
  );
  TestValidator.predicate("total_comments >= 0", overview.total_comments >= 0);
  TestValidator.equals(
    "total_replies is int32 type",
    typeof overview.total_replies,
    "number",
  );
  TestValidator.predicate("total_replies >= 0", overview.total_replies >= 0);
  TestValidator.equals(
    "avg_sentiment is number",
    typeof overview.avg_sentiment,
    "number",
  );
  TestValidator.equals(
    "total_reports is int32 type",
    typeof overview.total_reports,
    "number",
  );
  TestValidator.predicate("total_reports >= 0", overview.total_reports >= 0);
  TestValidator.equals(
    "mod_actions_taken is int32 type",
    typeof overview.mod_actions_taken,
    "number",
  );
  TestValidator.predicate(
    "mod_actions_taken >= 0",
    overview.mod_actions_taken >= 0,
  );
  TestValidator.equals(
    "notifications_sent is int32 type",
    typeof overview.notifications_sent,
    "number",
  );
  TestValidator.predicate(
    "notifications_sent >= 0",
    overview.notifications_sent >= 0,
  );
}
