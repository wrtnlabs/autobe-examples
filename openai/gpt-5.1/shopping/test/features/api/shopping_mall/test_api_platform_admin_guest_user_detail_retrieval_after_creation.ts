import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_guest_user_detail_retrieval_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain authorized session
  const adminJoinRequest =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a new guest user record under platform admin context
  const guestCreateBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(32),
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  } satisfies IShoppingMallGuestUser.ICreate;

  const createdGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(createdGuest);

  // Basic field validations on creation response
  TestValidator.equals(
    "created guest temporary_identifier matches request body",
    createdGuest.temporary_identifier,
    guestCreateBody.temporary_identifier,
  );
  TestValidator.equals(
    "created guest user_agent matches request body",
    createdGuest.user_agent,
    guestCreateBody.user_agent,
  );
  await TestValidator.predicate(
    "created_at must be a non-empty string",
    async () =>
      typeof createdGuest.created_at === "string" &&
      createdGuest.created_at.length > 0,
  );
  await TestValidator.predicate(
    "updated_at must be a non-empty string",
    async () =>
      typeof createdGuest.updated_at === "string" &&
      createdGuest.updated_at.length > 0,
  );
  await TestValidator.predicate(
    "deleted_at is null or undefined right after creation",
    async () =>
      createdGuest.deleted_at === null || createdGuest.deleted_at === undefined,
  );

  // 3. Retrieve the guest user by id via detail endpoint
  const detailGuest: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.at(connection, {
      guestUserId: createdGuest.id,
    });
  typia.assert<IShoppingMallGuestUser>(detailGuest);

  // 4. Validate detail response matches expectations
  TestValidator.equals(
    "detail id matches created guest id",
    detailGuest.id,
    createdGuest.id,
  );
  TestValidator.equals(
    "detail temporary_identifier matches creation body",
    detailGuest.temporary_identifier,
    guestCreateBody.temporary_identifier,
  );
  TestValidator.equals(
    "detail user_agent matches creation body",
    detailGuest.user_agent,
    guestCreateBody.user_agent,
  );
  await TestValidator.predicate(
    "detail created_at is a non-empty string",
    async () =>
      typeof detailGuest.created_at === "string" &&
      detailGuest.created_at.length > 0,
  );
  await TestValidator.predicate(
    "detail updated_at is a non-empty string",
    async () =>
      typeof detailGuest.updated_at === "string" &&
      detailGuest.updated_at.length > 0,
  );
  await TestValidator.predicate(
    "detail deleted_at is null or undefined",
    async () =>
      detailGuest.deleted_at === null || detailGuest.deleted_at === undefined,
  );

  // 5. Call detail endpoint again to ensure read-only behavior
  const detailGuestAgain: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.at(connection, {
      guestUserId: createdGuest.id,
    });
  typia.assert<IShoppingMallGuestUser>(detailGuestAgain);

  TestValidator.equals(
    "repeated GET returns same data as first detail response",
    detailGuestAgain,
    detailGuest,
  );
}
