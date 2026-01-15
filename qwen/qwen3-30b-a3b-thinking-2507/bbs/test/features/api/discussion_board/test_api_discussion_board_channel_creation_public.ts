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

export async function test_api_discussion_board_channel_creation_public(connection: api.IConnection): Promise<void> {
    // Create a new connection for admin operations
    const adminConnection: api.IConnection = { host: connection.host };
    // Create new admin account
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123"
        },
    });
    // Create public channel with valid properties
    const channel = await generate_random_discussion_board_admin_channels_create(adminConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 1, wordMin: 1, wordMax: 50 }),
            description: RandomGenerator.content({
                paragraphs: 1,
                sentenceMin: 3,
                sentenceMax: 10
            }),
            visibility: "public"
        },
    });
    // Validate channel creation
    typia.assert(channel);
    TestValidator.equals("channel visibility", channel.visibility, "public");
    TestValidator.equals("channel name", channel.name, channel.name);
    TestValidator.equals("channel description", channel.description, channel.description);
}