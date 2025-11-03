import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannelDefinition";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";

/**
 * Validates child channel list retrieval with filter and pagination by an admin
 * user.
 *
 * This test performs the following steps:
 *
 * 1. Register and login an admin user
 * 2. Create a parent channel to get children from
 * 3. Create a set of child channels with varying filter matches
 * 4. Retrieve filtered and paginated child channels with sorting, verifying result
 *    count and page info
 * 5. Test edge case with filter that results in empty data
 * 6. Test error handling with invalid channelCode
 * 7. Verify that each item returned matches the filter criteria and summaries are
 *    correct
 */
export async function test_api_admin_channel_children_list_with_filter_pagination(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a parent channel
  const parentChannelCode = `PARENT_${RandomGenerator.alphabets(5).toUpperCase()}`;
  const parentChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        channel_code: parentChannelCode,
        channel_name: `Parent Channel ${RandomGenerator.paragraph({ sentences: 2 })}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parent_channel_id: null,
      } satisfies IShoppingMallChannelDefinition.ICreate,
    });
  typia.assert(parentChannel);

  // 3. Create multiple child channels, some matching filters, some not

  // Create 10 child channels, 6 that will match the filter and 4 that won't
  const childChannelsCreated: IShoppingMallChannelDefinition[] = [];
  for (let i = 0; i < 10; ++i) {
    const isMatching = i < 6; // first 6 will match filter
    const channelName = isMatching
      ? `Child Channel MATCH_${RandomGenerator.paragraph({ sentences: 1 })}`
      : `Child Channel NO_MATCH_${RandomGenerator.paragraph({ sentences: 1 })}`;
    const description = isMatching
      ? `Description MATCH_${RandomGenerator.paragraph({ sentences: 2 })}`
      : `Description NO_MATCH_${RandomGenerator.paragraph({ sentences: 2 })}`;

    const childChannel: IShoppingMallChannelDefinition =
      await api.functional.shoppingMall.admin.channels.create(connection, {
        body: {
          channel_code: `CHILD_${RandomGenerator.alphabets(7).toUpperCase()}`,
          channel_name: channelName,
          description: description,
          parent_channel_id: parentChannel.id,
        } satisfies IShoppingMallChannelDefinition.ICreate,
      });
    typia.assert(childChannel);
    childChannelsCreated.push(childChannel);
  }

  // 4. Filter and paginate retrieval - expect only matching child channels
  // Setup filter request for channel_name containing "MATCH", page 1, limit 3, sort by channel_code asc
  const filterRequest1: IShoppingMallChannelDefinition.IRequest = {
    page: 1,
    limit: 3,
    search_text: "MATCH",
    filter_channel_code: null,
    filter_channel_name: null,
    sort_by: "channel_code",
    sort_order: "asc",
  };

  const page1: IPageIShoppingMallChannelDefinition.ISummary =
    await api.functional.shoppingMall.admin.channels.children.index(
      connection,
      {
        channelCode: parentChannelCode,
        body: filterRequest1,
      },
    );
  typia.assert(page1);

  TestValidator.predicate(
    "Pagination page number should be 1",
    page1.pagination.current === 1,
  );

  TestValidator.predicate(
    "Pagination page size should be 3",
    page1.pagination.limit === 3,
  );

  // Calculate how many child channels match filter
  const matchingChildChannels = childChannelsCreated.filter((c) =>
    c.channel_name.includes("MATCH"),
  );

  TestValidator.equals(
    "Matching filtered records count should be correct",
    page1.pagination.records,
    matchingChildChannels.length,
  );

  TestValidator.equals(
    "Page count is correctly calculated",
    page1.pagination.pages,
    Math.ceil(matchingChildChannels.length / 3),
  );

  // Check returned data are max 3 and all contain "MATCH"
  TestValidator.predicate(
    "Returned data length should be at most limit",
    page1.data.length <= 3,
  );
  for (const child of page1.data) {
    TestValidator.predicate(
      `Child channel name contains 'MATCH' - ${child.channel_name}`,
      child.channel_name.includes("MATCH"),
    );
    // Also verify summaries properties exist and are correct type
    typia.assert<string>(child.channel_code);
    typia.assert<string>(child.channel_name);
    if (child.description !== null && child.description !== undefined) {
      typia.assert<string>(child.description);
    }
    typia.assert<string & tags.Format<"date-time">>(child.created_at);
  }

  // 5. Retrieve second page with same filter
  const filterRequest2: IShoppingMallChannelDefinition.IRequest = {
    page: 2,
    limit: 3,
    search_text: "MATCH",
    filter_channel_code: null,
    filter_channel_name: null,
    sort_by: "channel_code",
    sort_order: "asc",
  };

  const page2: IPageIShoppingMallChannelDefinition.ISummary =
    await api.functional.shoppingMall.admin.channels.children.index(
      connection,
      {
        channelCode: parentChannelCode,
        body: filterRequest2,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "Pagination page number should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "Page 2 returned data length should be at most limit",
    page2.data.length <= 3,
  );

  for (const child of page2.data) {
    TestValidator.predicate(
      `Page 2 child channel name contains 'MATCH' - ${child.channel_name}`,
      child.channel_name.includes("MATCH"),
    );
  }

  // 6. Test edge case with filter resulting in empty data
  const filterEmptyRequest: IShoppingMallChannelDefinition.IRequest = {
    page: 1,
    limit: 5,
    search_text: "NOMATCHING",
    filter_channel_code: null,
    filter_channel_name: null,
    sort_by: "channel_code",
    sort_order: "asc",
  };

  const emptyPage: IPageIShoppingMallChannelDefinition.ISummary =
    await api.functional.shoppingMall.admin.channels.children.index(
      connection,
      {
        channelCode: parentChannelCode,
        body: filterEmptyRequest,
      },
    );
  typia.assert(emptyPage);

  TestValidator.equals(
    "Empty page data should be length zero",
    emptyPage.data.length,
    0,
  );

  // 7. Test invalid channelCode handling - expect error
  await TestValidator.error("Invalid channelCode returns error", async () => {
    await api.functional.shoppingMall.admin.channels.children.index(
      connection,
      {
        channelCode: "INVALID_CODE",
        body: filterRequest1,
      },
    );
  });
}
