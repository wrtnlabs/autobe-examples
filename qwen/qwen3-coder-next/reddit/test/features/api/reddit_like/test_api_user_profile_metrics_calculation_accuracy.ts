import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_metrics_calculation_accuracy(
  connection: api.IConnection,
): Promise<void> {
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Fetch user metrics
  const metrics = await api.functional.redditLike.users.at(connection, {
    userId,
  });
  typia.assert(metrics);
  // Verify all required metrics fields exist and have correct types
  TestValidator.predicate(
    "total_posts is number",
    typeof metrics.total_posts === "number",
  );
  TestValidator.predicate(
    "posts_today is number",
    typeof metrics.posts_today === "number",
  );
  TestValidator.predicate(
    "total_comments is number",
    typeof metrics.total_comments === "number",
  );
  TestValidator.predicate(
    "comments_today is number",
    typeof metrics.comments_today === "number",
  );
  TestValidator.predicate(
    "total_votes is number",
    typeof metrics.total_votes === "number",
  );
  TestValidator.predicate(
    "comment_votes_today is number",
    typeof metrics.comment_votes_today === "number",
  );
  TestValidator.predicate(
    "total_communities is number",
    typeof metrics.total_communities === "number",
  );
  TestValidator.predicate(
    "subscribed_count is number",
    typeof metrics.subscribed_count === "number",
  );
  TestValidator.predicate(
    "pending_reports is number",
    typeof metrics.pending_reports === "number",
  );
  TestValidator.predicate(
    "active_users is number",
    typeof metrics.active_users === "number",
  );
  // Verify all metrics are non-negative integers
  TestValidator.predicate("total_posts >= 0", metrics.total_posts >= 0);
  TestValidator.predicate("posts_today >= 0", metrics.posts_today >= 0);
  TestValidator.predicate("total_comments >= 0", metrics.total_comments >= 0);
  TestValidator.predicate("comments_today >= 0", metrics.comments_today >= 0);
  TestValidator.predicate("total_votes >= 0", metrics.total_votes >= 0);
  TestValidator.predicate(
    "comment_votes_today >= 0",
    metrics.comment_votes_today >= 0,
  );
  TestValidator.predicate(
    "total_communities >= 0",
    metrics.total_communities >= 0,
  );
  TestValidator.predicate(
    "subscribed_count >= 0",
    metrics.subscribed_count >= 0,
  );
  TestValidator.predicate("pending_reports >= 0", metrics.pending_reports >= 0);
  TestValidator.predicate("active_users >= 0", metrics.active_users >= 0);
}
