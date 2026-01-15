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
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformChannel";
import { prepare_random_community_platform_section } from "../../../prepare/prepare_random_community_platform_section";
import { generate_random_community_platform_admin_sections_create } from "../../../generate/generate_random_community_platform_admin_sections_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_list_section_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to access channel listing
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 2: Get all channels to identify sections with existing channels
  const allChannelsResponse =
    await api.functional.communityPlatform.member.channels.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformChannel.IRequest,
      },
    );
  typia.assert(allChannelsResponse);
  // Step 3: Find a section that has at least one channel
  const sectionsWithChannels = ArrayUtil.repeat(
    allChannelsResponse.data.length,
    (index) => {
      const channel = allChannelsResponse.data[index];
      return channel.section;
    },
  ).filter((section): section is ICommunityPlatformSection.ISummary => section !== undefined);
  // Ensure we have at least one section with channels
  if (sectionsWithChannels.length === 0) {
    throw new Error("No channels with associated sections found in the system");
  }
  // Step 4: Select a section with channels to use for filtering
  const targetSection = RandomGenerator.pick(sectionsWithChannels);
  // Step 5: Query channels filtered by the target sectionId
  const filteredChannelsResponse =
    await api.functional.communityPlatform.member.channels.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sectionId: targetSection.id,
        } satisfies ICommunityPlatformChannel.IRequest,
      },
    );
  typia.assert(filteredChannelsResponse);
  // Step 6: Validate that only channels belonging to the specified section are returned
  const targetSectionChannels = filteredChannelsResponse.data.filter(
    (c) => c.section.id === targetSection.id,
  );
  TestValidator.equals(
    "all returned channels belong to target section",
    targetSectionChannels.length,
    filteredChannelsResponse.data.length,
  );
  // Step 7: Verify that section summary information matches the target section
  const returnedSection = filteredChannelsResponse.data[0].section;
  TestValidator.equals(
    "section ID matches",
    returnedSection.id,
    targetSection.id,
  );
  TestValidator.equals(
    "section name matches",
    returnedSection.name,
    targetSection.name,
  );
  // Step 8: Confirm all returned channels have the correct section
  const allSectionsMatch = filteredChannelsResponse.data.every(
    (c) => c.section.id === targetSection.id,
  );
  TestValidator.predicate(
    "all channels belong to target section",
    allSectionsMatch,
  );
}