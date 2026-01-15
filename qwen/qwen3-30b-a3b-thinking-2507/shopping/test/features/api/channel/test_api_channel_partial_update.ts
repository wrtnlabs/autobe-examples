import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { prepare_random_shopping_mall_channel } from "../../../prepare/prepare_random_shopping_mall_channel";
import { generate_random_shopping_mall_admin_channels_create } from "../../../generate/generate_random_shopping_mall_admin_channels_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_partial_update(connection: api.IConnection): Promise<void> {
    // Create admin account
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: RandomGenerator.alphabets(8) + "@example.com",
            password: RandomGenerator.alphaNumeric(16),
            name: RandomGenerator.name(),
        },
    });
    typia.assert(admin);
    
    // Generate channel
    const channel = await generate_random_shopping_mall_admin_channels_create(adminConnection, {
        body: {
            channelCode: "channel_" + RandomGenerator.alphabets(4),
            name: RandomGenerator.name(1),
        },
    });
    typia.assert(channel);
    
    // Update channel name
    const updatedChannel = await api.functional.shoppingMall.admin.channels.update(adminConnection, {
        channelCode: channel.channelCode,
        body: {
            name: "Updated " + channel.name,
        },
    });
    typia.assert(updatedChannel);
    
    // Validate the update
    TestValidator.equals("channel name should be updated", updatedChannel.name, "Updated " + channel.name);
}