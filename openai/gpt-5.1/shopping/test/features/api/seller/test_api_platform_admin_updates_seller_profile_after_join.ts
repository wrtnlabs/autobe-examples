import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_updates_seller_profile_after_join(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to obtain authorized admin session (SDK sets Authorization header)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing/platform-admin",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a guest user as part of the broader lifecycle (admin namespace)
  const guestBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  } satisfies IShoppingMallGuestUser.ICreate;

  const guest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(guest);

  // 3. Prepare a target sellerId to be updated.
  // In real E2E this would come from a seller creation flow or fixture;
  // here we rely on typia.random UUID generation (or simulator) as seed data.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. First seller profile update via platformAdmin namespace
  const firstUpdateBody = {
    store_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_phone: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.IUpdate;

  const firstUpdatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.platformAdmin.sellers.update(connection, {
      sellerId,
      body: firstUpdateBody,
    });
  typia.assert<IShoppingMallSeller>(firstUpdatedSeller);

  // Business assertions for first update
  TestValidator.equals(
    "seller id should match path sellerId after first update",
    firstUpdatedSeller.id,
    sellerId,
  );
  TestValidator.equals(
    "store_name should be updated on first update",
    firstUpdatedSeller.store_name,
    firstUpdateBody.store_name,
  );
  TestValidator.equals(
    "contact_phone should be updated on first update",
    firstUpdatedSeller.contact_phone,
    firstUpdateBody.contact_phone,
  );
  if (firstUpdateBody.status !== undefined) {
    TestValidator.equals(
      "status should reflect first update payload when provided",
      firstUpdatedSeller.status,
      firstUpdateBody.status,
    );
  }

  const createdAtAfterFirst: string & tags.Format<"date-time"> =
    firstUpdatedSeller.created_at;

  // 5. Second update to verify subsequent changes and id stability
  const secondUpdateBody = {
    store_name: RandomGenerator.paragraph({ sentences: 3 }),
    contact_phone: RandomGenerator.mobile("011"),
    status: "suspended",
  } satisfies IShoppingMallSeller.IUpdate;

  const secondUpdatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.platformAdmin.sellers.update(connection, {
      sellerId,
      body: secondUpdateBody,
    });
  typia.assert<IShoppingMallSeller>(secondUpdatedSeller);

  // Validate that the seller id is stable across updates
  TestValidator.equals(
    "seller id must remain the same across updates",
    secondUpdatedSeller.id,
    firstUpdatedSeller.id,
  );

  // Validate store_name and contact_phone actually changed
  TestValidator.notEquals(
    "store_name should change between first and second update",
    firstUpdatedSeller.store_name,
    secondUpdatedSeller.store_name,
  );
  TestValidator.notEquals(
    "contact_phone should change between first and second update",
    firstUpdatedSeller.contact_phone,
    secondUpdatedSeller.contact_phone,
  );

  TestValidator.equals(
    "store_name should match second update payload",
    secondUpdatedSeller.store_name,
    secondUpdateBody.store_name,
  );
  TestValidator.equals(
    "contact_phone should match second update payload",
    secondUpdatedSeller.contact_phone,
    secondUpdateBody.contact_phone,
  );
  if (secondUpdateBody.status !== undefined) {
    TestValidator.equals(
      "status should reflect second update payload when provided",
      secondUpdatedSeller.status,
      secondUpdateBody.status,
    );
  }

  // Ensure created_at remains stable while updated_at can move forward.
  TestValidator.equals(
    "created_at should stay constant across updates",
    secondUpdatedSeller.created_at,
    createdAtAfterFirst,
  );
}
