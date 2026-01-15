import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardChannel";
import { prepare_random_discussion_board_channel } from "../../../prepare/prepare_random_discussion_board_channel";
import { generate_random_discussion_board_moderator_channels_create } from "../../../generate/generate_random_discussion_board_moderator_channels_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(admin);
  // Create a test channel with a specific name
  const searchTerm = "searchable-channel";
  const createdChannel: IDiscussionBoardChannel =
    await generate_random_discussion_board_moderator_channels_create(
      adminConnection,
      {
        body: {
          name: searchTerm,
          description: "A channel for testing search functionality",
          isArchived: false,
          visibility: "published",
          sortBy: "created_at",
        },
      },
    );
  typia.assert(createdChannel);
  // Create a second channel with a different name to ensure filtering works
  const otherChannel: IDiscussionBoardChannel =
    await generate_random_discussion_board_moderator_channels_create(
      adminConnection,
      {
        body: {
          name: "other-channel",
          description: "Another channel for testing search",
          isArchived: false,
          visibility: "published",
          sortBy: "created_at",
        },
      },
    );
  typia.assert(otherChannel);
  // Perform the search with partial name match
  const searchResult: IPageIDiscussionBoardChannel.ISummary =
    await api.functional.discussionBoard.channels.index(adminConnection, {
      body: {
        search: searchTerm.substring(0, 10), // Partial match (at least 10 chars for reliability)
        page: 1,
        limit: 10,
        sort_by: "name",
        order: "asc",
      },
    });
  typia.assert(searchResult);
  // Validate search results
  TestValidator.equals(
    "returned page has correct total records",
    searchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "returned page has correct current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "returned page has correct limit",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "returned page has correct number of pages",
    searchResult.pagination.pages,
    1,
  );
  // Verify the search returned exactly one result and it's the correct channel
  TestValidator.equals(
    "search returned exactly one channel",
    searchResult.data.length,
    1,
  );
  TestValidator.equals(
    "search returned correct channel name",
    searchResult.data[0].name,
    createdChannel.name,
  );
  // Verify the channel has the expected attributes from ISummary
  TestValidator.equals(
    "channel description matches",
    searchResult.data[0].description,
    createdChannel.description,
  );
  TestValidator.predicate(
    "channel is active",
    () => searchResult.data[0].is_active === true,
  );
  TestValidator.predicate(
    "channel is public",
    () => searchResult.data[0].is_public === true,
  );
  // Verify sorting works correctly
  TestValidator.equals(
    "channel name is in ascending order",
    searchResult.data[0].name,
    createdChannel.name,
  );
  // Ensure other channel is not in results
  TestValidator.predicate(
    "other channel not in results",
    () => !searchResult.data.some((channel) => channel.name === otherChannel.name),
  );
}