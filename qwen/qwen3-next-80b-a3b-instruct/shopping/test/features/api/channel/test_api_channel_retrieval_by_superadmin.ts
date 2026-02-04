import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_channel_retrieval_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSuperAdmin.IJoin;
  const authorizedSuperAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: superAdminData,
    });
  typia.assert(authorizedSuperAdmin);
  // Step 2: Generate a random UUID to use as a channel ID
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Call the API to retrieve the channel with the generated ID
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.superAdmin.channels.at(
      superAdminConnection,
      {
        channelId,
      },
    );
  typia.assert(channel);
  // Step 4: Validate the response contains only the expected property
  // According to the IShoppingMallChannel DTO definition,
  // the only property is 'id' - any other validation would be invalid
  TestValidator.equals("channel ID matches", channel.id, channelId);
}
