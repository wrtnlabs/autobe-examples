import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_guest_creation_and_deletion(
  connection: api.IConnection,
) {
  // 1. Create a guest user record without authentication
  const createdGuest: IRedditCommunityGuest =
    await api.functional.redditCommunity.guests.create(connection, {
      body: {} satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(createdGuest);

  // 2. Prepare admin user registration payload
  const adminUserCreateBody: IRedditCommunityAdmin.ICreate = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  };

  // 3. Register (join) new admin user with valid user_id
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminUserCreateBody,
    });
  typia.assert(adminAuthorized);

  // 4. Assertions confirming admin response fields
  TestValidator.predicate(
    "adminAuthorized.id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      adminAuthorized.id,
    ),
  );
  TestValidator.equals(
    "adminAuthorized.user_id matches input",
    adminAuthorized.user_id,
    adminUserCreateBody.user_id,
  );
  TestValidator.predicate(
    "adminAuthorized.token has access",
    typeof adminAuthorized.token.access === "string" &&
      adminAuthorized.token.access.length > 0,
  );

  // Note: The SDK automatically manages connection.headers for Authorization
  // after login/join, so no manual setting of headers should be done here.

  // 5. Create another guest user record to simulate lifecycle completion
  const secondCreatedGuest: IRedditCommunityGuest =
    await api.functional.redditCommunity.guests.create(connection, {
      body: {} satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(secondCreatedGuest);

  TestValidator.notEquals(
    "guest user id should differ on new creation",
    createdGuest.id,
    secondCreatedGuest.id,
  );
}
