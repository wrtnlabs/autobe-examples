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
export async function test_api_channel_section_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
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
  // Step 2: Create a channel to host the new section
  const channel: ICommunityBbsChannel =
    await generate_random_community_bbs_admin_channels_create(adminConnection, {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        visibility: "public",
      } satisfies ICommunityBbsChannel.ICreate,
    });
  typia.assert(channel);
  // Step 3: Create a new section within the channel
  const section: ICommunityBbsSection =
    await generate_random_community_bbs_admin_channels_sections_create(
      adminConnection,
      {
        params: {
          channelId: channel.id,
        },
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          position: 1,
        } satisfies ICommunityBbsSection.ICreate,
      },
    );
  typia.assert(section);
  // Step 4: Validate the created section
  TestValidator.equals("section name matches", section.name, section.name);
  TestValidator.equals(
    "section is associated with correct channel",
    section.channel_id,
    channel.id,
  );
  TestValidator.predicate("section has a position", section.position >= 0);
  TestValidator.predicate(
    "section has a creation timestamp",
    new Date(section.created_at).getTime() > 0,
  );
  TestValidator.equals(
    "section has generated UUID",
    section.id.length > 0,
    true,
  );
}
