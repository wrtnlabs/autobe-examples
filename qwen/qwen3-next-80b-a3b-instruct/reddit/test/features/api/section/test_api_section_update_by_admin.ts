import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsChannel";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_section } from "../../../prepare/prepare_random_community_bbs_section";
import { prepare_random_community_bbs_channel } from "../../../prepare/prepare_random_community_bbs_channel";
import { generate_random_community_bbs_admin_channels_create } from "../../../generate/generate_random_community_bbs_admin_channels_create";
import { generate_random_community_bbs_admin_channels_sections_create } from "../../../generate/generate_random_community_bbs_admin_channels_sections_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_section_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a channel using the utility function
  const channel = await generate_random_community_bbs_admin_channels_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        visibility: "public",
      } satisfies ICommunityBbsChannel.ICreate,
    },
  );
  typia.assert(channel);
  // Step 3: Create a section using the utility function
  const section =
    await generate_random_community_bbs_admin_channels_sections_create(
      adminConnection,
      {
        params: {
          channelId: channel.id,
        },
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          position: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityBbsSection.ICreate,
      },
    );
  typia.assert(section);
  // Step 4: Update the section with new properties
  const newTitle = RandomGenerator.name();
  const newDescription = RandomGenerator.content();
  const newPosition = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const newPermissions = JSON.stringify({
    read: ["member", "moderator"],
    write: ["moderator"],
  });
  const updatedSection =
    await api.functional.communityBbs.admin.channels.sections.update(
      adminConnection,
      {
        channelId: channel.id,
        sectionId: section.id,
        body: {
          name: newTitle,
          description: newDescription,
          display_order: newPosition,
          is_enabled: true,
          is_visible: true,
          permissions: newPermissions,
        } satisfies ICommunityBbsSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // Step 5: Validate all properties were correctly updated - only properties present in ICommunityBbsSection
  TestValidator.equals(
    "updated section name matches",
    updatedSection.name,
    newTitle,
  );
  TestValidator.equals(
    "updated section description matches",
    updatedSection.description,
    newDescription,
  );
  TestValidator.equals(
    "updated section position matches",
    updatedSection.position,
    newPosition,
  );
  TestValidator.equals(
    "updated section is_visible matches",
    updatedSection.is_visible,
    true,
  );
}
