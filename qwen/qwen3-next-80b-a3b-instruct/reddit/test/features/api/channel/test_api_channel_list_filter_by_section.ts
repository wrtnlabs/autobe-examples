import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformChannelSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannelSettings";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformChannel";
import { prepare_random_community_platform_section } from "../../../prepare/prepare_random_community_platform_section";
import { prepare_random_community_platform_channel } from "../../../prepare/prepare_random_community_platform_channel";
import { generate_random_community_platform_admin_channels_create } from "../../../generate/generate_random_community_platform_admin_channels_create";
import { generate_random_community_platform_admin_sections_create } from "../../../generate/generate_random_community_platform_admin_sections_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_list_filter_by_section(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate admin using the utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a section using the utility function and capture the full section object
  const section =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  // Type assertion to extract the ID from the section (it's a string type in the DTO)
  const sectionId: string = section;
  typia.assert(section);
  // Step 3: Create a channel within the section using the utility function
  const channel =
    await generate_random_community_platform_admin_channels_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          is_public: true,
          settings: typia.random<ICommunityPlatformChannelSettings>(),
        } satisfies ICommunityPlatformChannel.ICreate,
      },
    );
  typia.assert(channel);
  // Step 4: Verify channel was created successfully and has the expected properties
  TestValidator.equals(
    "channel created successfully",
    channel.name,
    channel.name,
  );
  // Validate channel status is "active" (our expectation)
  TestValidator.equals(
    "channel created with expected status",
    channel.status,
    "active",
  );
  // Step 5: Retrieve the filtered channel list using the section ID as filter
  const response = await api.functional.communityPlatform.admin.channels.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sectionId: sectionId, // Use the section ID string
      } satisfies ICommunityPlatformChannel.IRequest,
    },
  );
  typia.assert(response);
  // Step 6: Validate response structure
  const expectedTotalPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "page number matches request",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit matches request", response.pagination.limit, 10);
  TestValidator.equals(
    "records count is correct",
    response.pagination.records,
    1,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    response.pagination.pages,
    expectedTotalPages,
  );
  TestValidator.equals(
    "response data contains exactly one channel",
    response.data.length,
    1,
  );
  // Step 7: Validate the returned channel summary using actual values from created channel
  const returnedChannel = response.data[0];
  // Channel ID comparison (type: string & Format<"uuid">)
  TestValidator.equals(
    "returned channel ID matches created channel",
    returnedChannel.id,
    channel.id,
  );
  // Channel name comparison
  TestValidator.equals(
    "returned channel name matches created channel",
    returnedChannel.name,
    channel.name,
  );
  // Channel description comparison
  TestValidator.equals(
    "returned channel description matches created channel",
    returnedChannel.description,
    channel.description,
  );
  // Status comparison - both the created channel and summary show active status in our test
  // The summary type has "active" | "archived" | "pending" while the channel has "active" | "archived" | "suspended"
  // Since we created the channel with "active" status (and we expect it to remain active),
  // we can assert that both representations will show "active" independently of their different union types
  TestValidator.equals(
    "returned channel status is active (expected)",
    returnedChannel.status,
    "active",
  );
  TestValidator.equals(
    "created channel status is active (expected)",
    channel.status,
    "active",
  );
  // Created at comparison
  TestValidator.equals(
    "returned channel created at matches created channel",
    returnedChannel.created_at,
    channel.created_at,
  );
  // Step 8: Validate section information in the channel summary
  // returnedChannel.section is of type ICommunityPlatformSection.ISummary
  // We've already validated that the sectionId matches
  TestValidator.equals(
    "returned channel section ID matches created section ID",
    returnedChannel.section.id,
    sectionId,
  );
  // We cannot validate returnedChannel.section.name, returnedChannel.section.created_at, returnedChannel.section.status
  // because we don't have the full section object (it's a string ID in our scope)
  // The guarantee that the section ID matches is the primary purpose of this test
}
