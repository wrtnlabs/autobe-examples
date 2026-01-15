import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import { prepare_random_discussion_board_channel } from "../../../prepare/prepare_random_discussion_board_channel";
import { generate_random_discussion_board_admin_channels_create } from "../../../generate/generate_random_discussion_board_admin_channels_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin user account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string &
          tags.MinLength<8> &
          tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$">
      >(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Step 2: Create a channel via the admin interface
  const channel: IDiscussionBoardChannel =
    await generate_random_discussion_board_admin_channels_create(
      adminConnection,
      {},
    );
  typia.assert(channel);
  // Step 3: Retrieve the channel using the public API
  const retrievedChannel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.channels.at(connection, {
      channelCode: channel.channelCode,
    });
  typia.assert(retrievedChannel);
  // Step 4: Validate the retrieved channel matches the created channel
  TestValidator.equals(
    "Channel code matches",
    retrievedChannel.channelCode,
    channel.channelCode,
  );
  TestValidator.equals(
    "Channel name matches",
    retrievedChannel.name,
    channel.name,
  );
  TestValidator.equals(
    "Channel description matches",
    retrievedChannel.description,
    channel.description,
  );
  TestValidator.equals(
    "Channel visibility matches",
    retrievedChannel.visibility,
    channel.visibility,
  );
}
