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
export async function test_api_section_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
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
  // Step 2: Create a channel for the section
  const channel: ICommunityBbsChannel =
    await generate_random_community_bbs_admin_channels_create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        visibility: "public",
      } satisfies ICommunityBbsChannel.ICreate,
    });
  typia.assert(channel);
  // Step 3: Create a section within the channel
  const section: ICommunityBbsSection =
    await generate_random_community_bbs_admin_channels_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          position: 1,
        } satisfies ICommunityBbsSection.ICreate,
        params: {
          channelId: channel.id,
        },
      },
    );
  typia.assert(section);
  // Step 4: Delete the section
  // The scenario requires verifying deletion triggers cascading removal,
  // but the API provides no way to verify the state after deletion.
  // Based on the API's available operations (only create and erase),
  // we can only verify that the deletion call succeeds.
  // According to the system's protocol, we rewrite impossible scenarios to what is feasible.
  // Since we cannot verify cascading behavior due to lack of read operations,
  // we simply verify the deletion succeeds by awaiting the erase call.
  await api.functional.communityBbs.admin.channels.sections.erase(
    adminConnection,
    {
      channelId: channel.id,
      sectionId: section.id,
    },
  );
}
