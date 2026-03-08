import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_retrieval_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for testing
  const testUserId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve user profile (public endpoint, no authentication required)
  const profile = await api.functional.redditLike.users.at(connection, {
    userId: testUserId,
  });
  typia.assert(profile);
  // Verify all metric values are non-negative integers as required by the schema
  TestValidator.predicate("total_posts >= 0", profile.total_posts >= 0);
  TestValidator.predicate("posts_today >= 0", profile.posts_today >= 0);
  TestValidator.predicate("total_comments >= 0", profile.total_comments >= 0);
  TestValidator.predicate("comments_today >= 0", profile.comments_today >= 0);
  TestValidator.predicate("total_votes >= 0", profile.total_votes >= 0);
  TestValidator.predicate(
    "comment_votes_today >= 0",
    profile.comment_votes_today >= 0,
  );
  TestValidator.predicate(
    "total_communities >= 0",
    profile.total_communities >= 0,
  );
  TestValidator.predicate(
    "subscribed_count >= 0",
    profile.subscribed_count >= 0,
  );
  TestValidator.predicate("pending_reports >= 0", profile.pending_reports >= 0);
  TestValidator.predicate("active_users >= 0", profile.active_users >= 0);
}
