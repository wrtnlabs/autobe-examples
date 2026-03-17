import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_notifications_approval_status_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Create new connection with seller's token for authenticated requests
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  sellerAuthConnection.headers = {
    Authorization: seller.token.access,
  };
  // 2. Seller calls notifications endpoint with type filter for seller_approval
  const notifications: IPageIEcommerceMallNotification.ISummary =
    await api.functional.ecommerceMall.seller.notifications.index(
      sellerAuthConnection,
      {
        body: {
          type: "seller_approval",
          actor_type: "seller",
          actor_id: seller.id,
          per_page: 10,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(notifications);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page is at least 1",
    notifications.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    notifications.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    notifications.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    notifications.pagination.pages >= 0,
  );
  // 4. Validate data array is present
  TestValidator.equals(
    "data array exists",
    notifications.data,
    notifications.data,
  );
  // 5. Validate notification structure if any notifications exist
  if (notifications.data.length > 0) {
    const firstNotification = notifications.data[0];
    typia.assert(firstNotification);
    // Validate notification type matches filter
    TestValidator.equals(
      "notification type is seller_approval",
      firstNotification.type,
      "seller_approval",
    );
    // Validate notification has title content
    TestValidator.predicate(
      "notification title has content",
      firstNotification.title.length > 0,
    );
    // Validate notification has body content
    TestValidator.predicate(
      "notification body has content",
      firstNotification.body.length > 0,
    );
    // Validate notification status is valid
    TestValidator.predicate(
      "notification status is valid",
      firstNotification.status === "unread" ||
        firstNotification.status === "read",
    );
    // Validate created_at is valid date-time
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(firstNotification.created_at)),
    );
    // Validate notification has unique UUID id
    TestValidator.predicate(
      "notification has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstNotification.id,
      ),
    );
    // Validate updated_at is valid date-time if present
    if (firstNotification.updated_at) {
      TestValidator.predicate(
        "updated_at is valid date-time",
        !isNaN(Date.parse(firstNotification.updated_at)),
      );
    }
  } else {
    // If no notifications, validate empty array is valid response
    TestValidator.equals(
      "data array is empty when no seller_approval notifications",
      notifications.data.length,
      0,
    );
  }
}
