import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotification";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Ensure that only authenticated admins can create admin notifications.
 *
 * Business context: Admin notifications represent governance and operational
 * tasks that must be generated only by trusted administrative actors or
 * privileged internal workflows. This test verifies that the public
 * authentication flows for customer, seller, and guest users cannot be misused
 * to create admin notifications, and that anonymous clients are also blocked.
 * Only a properly authenticated admin actor should be able to call POST
 * /shoppingMall/admin/adminNotifications successfully.
 *
 * Test steps:
 *
 * 1. Register Admin A using /auth/admin/join to obtain an admin identity and an
 *    access token.
 * 2. Derive an `anonymousConnection` from the base connection with empty headers
 *    so that no Authorization is present.
 * 3. Register a customer using /auth/customer/join on a cloned connection with its
 *    own empty headers to produce `customerConnection` authenticated as a
 *    customer actor.
 * 4. Register a seller using /auth/seller/join on a cloned connection with its own
 *    empty headers to produce `sellerConnection` authenticated as a seller
 *    actor.
 * 5. Register a guest user using /auth/guestUser/join on a cloned connection with
 *    its own empty headers to produce `guestConnection` authenticated as a
 *    guestUser actor.
 * 6. Build a canonical notification creation payload targeting Admin A’s id and
 *    containing minimal valid fields (type, title, status) plus optional body.
 * 7. Attempt to call POST /shoppingMall/admin/adminNotifications with the
 *    canonical payload using each of the following:
 *
 *    - AnonymousConnection
 *    - CustomerConnection
 *    - SellerConnection
 *    - GuestConnection Each attempt must fail with some error; we assert only that
 *         an error is thrown, not specific HTTP status.
 * 8. Finally, call POST /shoppingMall/admin/adminNotifications with the admin
 *    connection associated with Admin A and the same payload. This must
 *    succeed, returning a fully-typed IShoppingMallAdminNotification.
 * 9. Validate with typia.assert and TestValidator that:
 *
 *    - The response admin summary id equals Admin A’s id.
 *    - The type, title, and status fields in the response match the request body.
 *
 * This test ensures that the authorization boundary around creating admin
 * notifications is correctly enforced.
 */
export async function test_api_admin_notification_create_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register Admin A and keep this connection as the admin-auth connection.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);
  const adminId = adminAuth.id;

  // 2. Derive an anonymous connection (no Authorization header).
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Create a customer-authenticated connection with its own headers object.
  const customerConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(customerConnection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 4. Create a seller-authenticated connection with its own headers object.
  const sellerConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(sellerConnection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 5. Create a guest-authenticated connection with its own headers object.
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const guestJoinBody = {
    external_reference: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallGuestUser.IJoin;
  const guestAuth: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(guestConnection, {
      body: guestJoinBody,
    });
  typia.assert(guestAuth);

  // 6. Canonical notification creation payload targeting Admin A.
  const notificationType = "risk_sla_violation";
  const notificationTitle = RandomGenerator.paragraph({
    sentences: 3,
  });
  const notificationStatus = "unread";

  const notificationBody = {
    shopping_mall_admin_id: adminId,
    related_risk_case_id: undefined,
    related_legal_hold_id: undefined,
    type: notificationType,
    title: notificationTitle,
    body: RandomGenerator.content({ paragraphs: 1 }),
    status: notificationStatus,
    priority: undefined,
    entity_type: undefined,
    entity_id: undefined,
    entity_display: undefined,
    read_at: undefined,
    archived_at: undefined,
  } satisfies IShoppingMallAdminNotification.ICreate;

  // Helper closure to attempt creation and expect failure.
  const expectCreateForbidden = async (
    title: string,
    conn: api.IConnection,
  ): Promise<void> => {
    await TestValidator.error(title, async () => {
      await api.functional.shoppingMall.admin.adminNotifications.create(conn, {
        body: notificationBody,
      });
    });
  };

  // 7. Negative authorization tests.
  await expectCreateForbidden(
    "anonymous client cannot create admin notification",
    anonymousConnection,
  );

  await expectCreateForbidden(
    "customer actor cannot create admin notification",
    customerConnection,
  );

  await expectCreateForbidden(
    "seller actor cannot create admin notification",
    sellerConnection,
  );

  await expectCreateForbidden(
    "guest user actor cannot create admin notification",
    guestConnection,
  );

  // 8. Positive test with admin connection.
  const created: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: notificationBody,
      },
    );
  typia.assert(created);

  // 9. Business assertions.
  TestValidator.predicate(
    "created notification should reference an admin summary",
    created.admin !== undefined && created.admin !== null,
  );

  if (created.admin !== undefined && created.admin !== null) {
    TestValidator.equals(
      "created notification admin id matches Admin A id",
      created.admin.id,
      adminId,
    );
  }

  TestValidator.equals(
    "created notification type matches request body",
    created.type,
    notificationType,
  );

  TestValidator.equals(
    "created notification title matches request body",
    created.title,
    notificationTitle,
  );

  TestValidator.equals(
    "created notification status matches request body",
    created.status,
    notificationStatus,
  );
}
