import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_detail_reflects_status_and_soft_delete(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin and obtain authorized session info
  const joinBody = {
    email: `platform-admin+${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: "203.0.113.10",
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const originalStatus: string = authorized.status;
  const originalIsActive: boolean = authorized.isActive;
  const originalCreatedAt: string = authorized.createdAt;
  const originalUpdatedAt: string = authorized.updatedAt;

  // 2. Create a guest user as an environmental prerequisite
  const guestBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(16),
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/1.0",
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestBody,
      },
    );
  typia.assert(guestUser);

  // 3. Update platform admin status and deletedAt via update endpoint
  const softDeletedAt: string = new Date().toISOString();
  const updatedStatus: string = "suspended";

  const updateBody = {
    status: updatedStatus,
    deletedAt: softDeletedAt,
  } satisfies IShoppingMallPlatformAdmin.IUpdate;

  const updatedAdmin: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.update(
      connection,
      {
        platformAdminId: authorized.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAdmin);

  // Validate immediate update response reflects lifecycle and soft delete fields
  TestValidator.equals(
    "update response id should match joined admin id",
    updatedAdmin.id,
    authorized.id,
  );
  TestValidator.equals(
    "update response email should remain unchanged",
    updatedAdmin.email,
    authorized.email,
  );
  TestValidator.equals(
    "update response status should equal requested status",
    updatedAdmin.status,
    updatedStatus,
  );
  TestValidator.equals(
    "update response deletedAt should equal requested soft delete timestamp",
    updatedAdmin.deletedAt,
    softDeletedAt,
  );
  TestValidator.equals(
    "createdAt should remain unchanged after update",
    updatedAdmin.createdAt,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updatedAt should differ after lifecycle update",
    updatedAdmin.updatedAt,
    originalUpdatedAt,
  );

  // 4. Fetch admin detail via GET detail endpoint
  const detailedAdmin: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId: authorized.id,
      },
    );
  typia.assert(detailedAdmin);

  // 5. Assert detail response reflects persisted lifecycle and soft delete state
  TestValidator.equals(
    "detail id should match joined admin id",
    detailedAdmin.id,
    authorized.id,
  );
  TestValidator.equals(
    "detail email should equal original email",
    detailedAdmin.email,
    authorized.email,
  );
  TestValidator.equals(
    "detail status should equal updated status",
    detailedAdmin.status,
    updatedStatus,
  );
  TestValidator.equals(
    "detail deletedAt should equal soft delete timestamp",
    detailedAdmin.deletedAt,
    softDeletedAt,
  );
  TestValidator.equals(
    "detail createdAt should remain same as original",
    detailedAdmin.createdAt,
    originalCreatedAt,
  );
  TestValidator.equals(
    "detail updatedAt should equal updated updatedAt",
    detailedAdmin.updatedAt,
    updatedAdmin.updatedAt,
  );

  // 6. Validate isActive semantics qualitatively: status change to non-active
  // string should be reflected by a change in isActive flag between original
  // session and current admin record, if the implementation derives it
  if (originalStatus !== updatedStatus) {
    TestValidator.notEquals(
      "isActive flag should reflect change in lifecycle status when status string changed",
      detailedAdmin.isActive,
      originalIsActive,
    );
  }

  // 7. Ensure that record remains retrievable even when soft-deleted by
  // asserting that deletedAt is set in the detail response.
  TestValidator.predicate(
    "soft-deleted admin record should expose non-null deletedAt in detail response",
    detailedAdmin.deletedAt !== undefined && detailedAdmin.deletedAt !== null,
  );
}
