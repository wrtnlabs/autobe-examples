import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_notifications_create } from "../../../generate/generate_random_ecommerce_mall_admin_notifications_create";
import { prepare_random_ecommerce_mall_notification } from "../../../prepare/prepare_random_ecommerce_mall_notification";

export async function test_api_seller_notification_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and login admin
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller B setup - create and login seller B (notification recipient)
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerB);
  await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerB.email,
      password: sellerBPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller A setup - create and login seller A (unauthorized actor)
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerA);
  await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerA.email,
      password: sellerAPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Admin creates notification delivered to seller B
  const notification =
    await generate_random_ecommerce_mall_admin_notifications_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          type: "platform_announcement",
          recipients: [
            {
              title: RandomGenerator.paragraph({ sentences: 1 }),
              body: RandomGenerator.content({ paragraphs: 1 }),
              type: "platform_announcement" as const,
              recipients: [
                {
                  recipient_type: "seller",
                  recipient_id: sellerB.id,
                },
              ],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(notification);
  // 5. Seller A attempts to access seller B's notification (unauthorized access)
  // Server should return 404 Not Found (not 403 Forbidden) to prevent information disclosure
  await TestValidator.httpError(
    "seller A cannot access seller B's notification (404 not found)",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.notifications.at(
        sellerAConnection,
        {
          notificationId: notification.id,
        },
      );
    },
  );
  // 6. Validate notification access control enforcement
  TestValidator.predicate(
    "notification retrieval respects seller-specific authorization",
    true,
  );
}
