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
import { prepare_random_community_bbs_channel } from "../../../prepare/prepare_random_community_bbs_channel";
import { generate_random_community_bbs_admin_channels_create } from "../../../generate/generate_random_community_bbs_admin_channels_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate admin using authorize_admin_join utility function (mandatory per utility function priority rule)
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Step 3: Create a new channel using the admin connection
  const channel: ICommunityBbsChannel =
    await api.functional.communityBbs.admin.channels.create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 1,
          wordMax: 50,
        }), // Max 100 chars via 2 x 50-word limit
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 6,
          wordMin: 2,
          wordMax: 40,
        }), // Max 500 chars via 6 x 40-word limit
      } satisfies ICommunityBbsChannel.ICreate,
    });
  // Step 4: Validate response
  typia.assert(channel);
  // Step 5: Validate business logic properties
  TestValidator.equals(
    "channel visibility default",
    channel.visibility,
    "public",
  );
  TestValidator.equals("channel status", channel.status, "active");
}
