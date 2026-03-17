import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_notifications_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration with authorization
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      user_agent: null,
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(guestAuth);
  // Create new connection with guest token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: guestAuth.token.access,
    },
  };
  // 2. Retrieve notifications for guest
  const notifications =
    await api.functional.ecommerceMall.guest.notifications.index(
      authenticatedConnection,
      {
        body: {} satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(notifications);
  // 3. Validate pagination structure
  const { pagination, data } = notifications;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.equals(
    "pages calculated correctly",
    pagination.pages,
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit),
  );
  // 4. Validate notification summaries structure
  if (data.length > 0) {
    const sampleNotification = data[0];
    typia.assert(sampleNotification);
    // Test that notification has required fields by verifying they exist
    TestValidator.equals(
      "notification has id",
      typeof sampleNotification.id,
      "string",
    );
    TestValidator.equals(
      "notification has title",
      typeof sampleNotification.title,
      "string",
    );
    TestValidator.equals(
      "notification has body",
      typeof sampleNotification.body,
      "string",
    );
    TestValidator.equals(
      "notification has type",
      typeof sampleNotification.type,
      "string",
    );
    TestValidator.equals(
      "notification has status",
      typeof sampleNotification.status,
      "string",
    );
    TestValidator.equals(
      "notification has created_at",
      typeof sampleNotification.created_at,
      "string",
    );
    TestValidator.equals(
      "notification has updated_at",
      typeof sampleNotification.updated_at,
      "string",
    );
  }
}