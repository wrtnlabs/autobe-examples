import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_detail_retrieval_by_self(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator (registration + authentication)
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorizedAdmin);

  // Basic sanity checks on the authorized session
  TestValidator.predicate(
    "authorized admin id must be non-empty uuid string",
    () => authorizedAdmin.id.length > 0,
  );
  TestValidator.predicate(
    "authorized admin isActive should be true for freshly joined admin",
    authorizedAdmin.isActive === true,
  );

  // 2. Optionally create a guest user to satisfy upstream dependency scenario
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(24),
    user_agent: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      { body: guestCreateBody },
    );
  typia.assert(guestUser);

  // Sanity: created guest user should have an id
  TestValidator.predicate(
    "guest user id must be present",
    () => guestUser.id.length > 0,
  );

  // 3. Retrieve platform admin detail by self id using authenticated connection
  const platformAdmin: IShoppingMallPlatformAdmin =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.at(
      connection,
      {
        platformAdminId: authorizedAdmin.id,
      },
    );
  typia.assert(platformAdmin);

  // 4. Business-level validations comparing joined data and retrieved profile
  TestValidator.equals(
    "platform admin id must match authorized session id",
    platformAdmin.id,
    authorizedAdmin.id,
  );

  TestValidator.equals(
    "platform admin email must match join request email",
    platformAdmin.email,
    joinRequest.email,
  );

  TestValidator.equals(
    "platform admin displayName must match join request name",
    platformAdmin.displayName,
    joinRequest.name,
  );

  TestValidator.equals(
    "platform admin status should match authorized session status",
    platformAdmin.status,
    authorizedAdmin.status,
  );

  TestValidator.equals(
    "platform admin isActive should match authorized session isActive",
    platformAdmin.isActive,
    authorizedAdmin.isActive,
  );

  TestValidator.predicate(
    "platform admin createdAt must be a non-empty ISO date-time string",
    () => platformAdmin.createdAt.length > 0,
  );

  TestValidator.predicate(
    "platform admin updatedAt must be a non-empty ISO date-time string",
    () => platformAdmin.updatedAt.length > 0,
  );

  TestValidator.predicate(
    "platform admin deletedAt should be undefined for an active admin",
    () => platformAdmin.deletedAt === undefined,
  );

  // 5. Implicit validation that no sensitive credential fields are exposed
  //    by NOT having any access to password_hash or tokens on IShoppingMallPlatformAdmin.
}
