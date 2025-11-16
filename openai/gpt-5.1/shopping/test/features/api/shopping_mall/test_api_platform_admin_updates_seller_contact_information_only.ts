import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_updates_seller_contact_information_only(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized context
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest user in admin context (lifecycle dependency)
  const guestBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(24),
    user_agent: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestBody,
      },
    );
  typia.assert(guest);

  // 3. Obtain a baseline seller by calling update with an empty body
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const emptyUpdateBody = {} satisfies IShoppingMallSeller.IUpdate;

  const originalSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.platformAdmin.sellers.update(connection, {
      sellerId,
      body: emptyUpdateBody,
    });
  typia.assert(originalSeller);

  // 4. Prepare a narrow update: change only contact_phone
  const newPhone = RandomGenerator.mobile();
  const phoneOnlyUpdateBody = {
    contact_phone: newPhone,
  } satisfies IShoppingMallSeller.IUpdate;

  const updatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.platformAdmin.sellers.update(connection, {
      sellerId,
      body: phoneOnlyUpdateBody,
    });
  typia.assert(updatedSeller);

  // 5. Business invariants: IDs and core attributes must remain unchanged
  TestValidator.equals(
    "seller id must remain unchanged after contact phone update",
    updatedSeller.id,
    originalSeller.id,
  );

  TestValidator.equals(
    "seller email must remain unchanged after contact phone update",
    updatedSeller.email,
    originalSeller.email,
  );

  TestValidator.equals(
    "seller store_name must remain unchanged after contact phone update",
    updatedSeller.store_name,
    originalSeller.store_name,
  );

  TestValidator.equals(
    "seller status must remain unchanged after contact phone update",
    updatedSeller.status,
    originalSeller.status,
  );

  TestValidator.equals(
    "seller created_at must remain unchanged after contact phone update",
    updatedSeller.created_at,
    originalSeller.created_at,
  );

  // deleted_at is optional and nullable; normalize undefined to null for comparison
  TestValidator.equals(
    "seller deleted_at must remain unchanged after contact phone update",
    updatedSeller.deleted_at ?? null,
    originalSeller.deleted_at ?? null,
  );

  // 6. Verify contact_phone has been updated to the new value
  TestValidator.equals(
    "seller contact_phone must be updated to new phone",
    updatedSeller.contact_phone,
    newPhone,
  );

  // 7. Verify updated_at reflects the change
  TestValidator.notEquals(
    "updated_at must advance when contact_phone is updated",
    updatedSeller.updated_at,
    originalSeller.updated_at,
  );
}
