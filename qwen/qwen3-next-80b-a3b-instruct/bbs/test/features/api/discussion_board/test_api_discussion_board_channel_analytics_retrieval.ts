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
export async function test_api_discussion_board_channel_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve channel analytics using the specified endpoint
  const analytics: IPageIDiscussionBoardChannelAnalytics =
    await api.functional.discussionBoard.analytics.articles.channels.index(
      connection,
    );
  // Validate the entire response structure using typia.assert()
  // This completely validates pagination structure and data array contents
  // per IPageIDiscussionBoardChannelAnalytics schema definition
  typia.assert(analytics);
}
