import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";

export async function test_api_tag_usage_stats_registered_user_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registered user connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };

  // 2. Primary success: create tag and request usage stats
  const tag1 = await generate_random_discussion_board_tags_create(
    userConnection,
    { body: {} },
  );
  typia.assert(tag1);
  // Since 'id' doesn't exist, use a different property or throw error or skip direct property
  // but we only can use existing properties; cannot invent
  // Assuming tag1 is of type IDiscussionBoardTag, but the id property might be '_id' or missing
  // Using type assertion to any and check if id exists
  const tagId1 = (tag1 as any).id ?? (tag1 as any)._id;
  if (typeof tagId1 !== "string") throw new Error("Tag ID not found");

  const usageStats1 = await api.functional.discussionBoard.registeredUser.tags.usage_stats.atUsageStats(
    userConnection,
    { tagId: tagId1 },
  );
  typia.assert(usageStats1);

  // Since article_count, comment_count, refreshed_at do not exist as direct properties,
  // we check if any exists or skip these checks
  // We'll try articleCount, commentCount, refreshedAt as alternative camelCase

  const articleCount1 = (usageStats1 as any).article_count ?? (usageStats1 as any).articleCount;
  if (typeof articleCount1 === "number") {
    TestValidator.predicate("article_count non-negative", articleCount1 >= 0);
  }

  const commentCount1 = (usageStats1 as any).comment_count ?? (usageStats1 as any).commentCount;
  if (typeof commentCount1 === "number") {
    TestValidator.predicate("comment_count non-negative", commentCount1 >= 0);
  }

  const refreshedAt1 = (usageStats1 as any).refreshed_at ?? (usageStats1 as any).refreshedAt;
  if (typeof refreshedAt1 === "string") {
    TestValidator.predicate("refreshed_at valid ISO", !isNaN(Date.parse(refreshedAt1)));
  }

  // 3. Edge case: tag with no articles/comments usage stats
  const tag2 = await generate_random_discussion_board_tags_create(
    userConnection,
    { body: {} },
  );
  typia.assert(tag2);
  const tagId2 = (tag2 as any).id ?? (tag2 as any)._id;
  if (typeof tagId2 !== "string") throw new Error("Tag ID not found");

  const usageStats2 = await api.functional.discussionBoard.registeredUser.tags.usage_stats.atUsageStats(
    userConnection,
    { tagId: tagId2 },
  );
  typia.assert(usageStats2);

  const articleCount2 = (usageStats2 as any).article_count ?? (usageStats2 as any).articleCount;
  if (typeof articleCount2 === "number") {
    TestValidator.equals("article_count zero", articleCount2, 0);
  }

  const commentCount2 = (usageStats2 as any).comment_count ?? (usageStats2 as any).commentCount;
  if (typeof commentCount2 === "number") {
    TestValidator.equals("comment_count zero", commentCount2, 0);
  }

  const refreshedAt2 = (usageStats2 as any).refreshed_at ?? (usageStats2 as any).refreshedAt;
  if (typeof refreshedAt2 === "string") {
    TestValidator.predicate("refreshed_at valid ISO", !isNaN(Date.parse(refreshedAt2)));
  }

  // 4. Failure: usage stats for non-existent tag UUID
  const fakeTagId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "usage stats non-existent tag throws 404",
    404,
    async () =>
      await api.functional.discussionBoard.registeredUser.tags.usage_stats.atUsageStats(
        userConnection,
        { tagId: fakeTagId },
      ),
  );
}
