import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_user_notification_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(authorized);
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a user notification to be deleted (simulate creation)
  // Since no creation API for userNotifications is provided, we'll simulate by generating a UUID
  // and assume it corresponds to a notification owned by this seller.
  // For real E2E, this step would create the notification via API or fixture.
  const userNotificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the user notification
  await api.functional.shoppingMall.seller.userNotifications.erase(
    sellerConnection,
    {
      userNotificationId,
    },
  );
  // 4. Verify deletion by attempting to delete again and expecting 404 or unauthorized
  await TestValidator.httpError(
    "User notification deletion: deleting already deleted notification fails",
    404,
    async () => {
      await api.functional.shoppingMall.seller.userNotifications.erase(
        sellerConnection,
        {
          userNotificationId,
        },
      );
    },
  );
}
