import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_channel_listing_default_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const email = RandomGenerator.alphaNumeric(10) + "@example.com";
  const password = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, { body: { email, password } });
  // 2. Call channel index endpoint without status filter
  const channelList = await api.functional.shoppingMall.admin.channels.index(
    adminConnection,
    {
      body: {
        // No status filter specified to verify default behavior
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  // 3. Verify all channels in response are active
  for (const channel of channelList.data) {
    TestValidator.equals(
      `Channel ${channel.id} should be active by default`,
      channel.status,
      "active",
    );
  }
}
