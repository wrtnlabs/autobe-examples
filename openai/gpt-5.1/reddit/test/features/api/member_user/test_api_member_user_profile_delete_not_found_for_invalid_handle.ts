import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that deleting a member user profile by a non-existent handle fails
 * with an error and does not impact valid member user state.
 *
 * Scenario:
 *
 * 1. Register a new memberUser via auth.memberUser.join, getting an authorized
 *    member (IAuthorized) and token. SDK wiring ensures that the Authorization
 *    header is updated for subsequent calls.
 * 2. With this authenticated context, create a community via
 *    communityPlatform.memberUser.communities.create, confirming that the
 *    member user is active and has the expected permissions.
 * 3. Generate an invalid handle string that is guaranteed not to exist by
 *    combining a fixed prefix with a random alpha-numeric suffix, and ensure it
 *    is different from the real username we got from join.
 * 4. Call communityPlatform.memberUser.profiles.erase with the invalid handle and
 *    assert that it throws an error using TestValidator.error. We do not care
 *    about the exact HTTP status code; only that it fails.
 * 5. After the failed delete attempt, create another community successfully to
 *    prove that the authenticated member user context and existing data remain
 *    unaffected by the erroneous delete request.
 */
export async function test_api_member_user_profile_delete_not_found_for_invalid_handle(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain an authorized context.
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create an initial community to confirm the context works.
  const createCommunityBody1 =
    typia.random<ICommunityPlatformCommunity.ICreate>();
  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createCommunityBody1,
      },
    );
  typia.assert(community1);

  // 3. Build an invalid handle guaranteed not to match any existing profile.
  const invalidHandleBase = `invalid-${RandomGenerator.alphaNumeric(16)}`;
  // Ensure it does not accidentally equal the real username.
  const invalidHandle =
    invalidHandleBase === authorized.username
      ? `${invalidHandleBase}-x`
      : invalidHandleBase;

  TestValidator.notEquals(
    "invalid handle must differ from real username",
    invalidHandle,
    authorized.username,
  );

  // 4. Attempt to erase profile with non-existent handle and expect error.
  await TestValidator.error(
    "erasing profile by non-existent handle must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.profiles.erase(
        connection,
        {
          handle: invalidHandle,
        },
      );
    },
  );

  // 5. Ensure valid context remains unaffected by creating another community.
  const createCommunityBody2 =
    typia.random<ICommunityPlatformCommunity.ICreate>();
  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createCommunityBody2,
      },
    );
  typia.assert(community2);

  // Sanity check: both communities belong to some owner_memberuser_id
  // and are distinct records.
  TestValidator.predicate(
    "first community has an owner_memberuser_id",
    () =>
      typeof community1.owner_memberuser_id === "string" &&
      community1.owner_memberuser_id.length > 0,
  );

  TestValidator.predicate(
    "second community has an owner_memberuser_id",
    () =>
      typeof community2.owner_memberuser_id === "string" &&
      community2.owner_memberuser_id.length > 0,
  );

  TestValidator.notEquals(
    "two communities should be distinct records",
    community1.id,
    community2.id,
  );
}
