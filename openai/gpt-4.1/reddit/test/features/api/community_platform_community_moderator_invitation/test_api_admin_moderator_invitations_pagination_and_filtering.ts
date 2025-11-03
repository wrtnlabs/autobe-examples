import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorInvitation";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorInvitation";

/**
 * Validate pagination, filtering, and access control for platform admin
 * searching moderator invitations in a community.
 *
 * Steps:
 *
 * 1. Create and authenticate a platform admin using random, valid registration
 *    fields.
 * 2. Using admin privileges, create a new community.
 * 3. Call moderator invitations search endpoint with various pagination/filter
 *    configurations:
 *
 *    - No filters (get all invitations; at this point will be empty)
 *    - Page/limit options (edge: empty, single page, oversized page)
 *    - Filtering by non-existent and random user IDs/status values
 * 4. Validate returned invitations page object structure, data array, and
 *    pagination metadata for each query.
 * 5. Confirm that admin-only fields are present in returned records.
 * 6. Simulate a non-admin (unauthenticated) context and attempt the same search --
 *    expect access denied (error is thrown).
 */
export async function test_api_admin_moderator_invitations_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const adminReg = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://admin-onboard.example.com/flow",
    referrer: "https://referrer.example.com/home",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminReg,
  });
  typia.assert(adminAuth);

  // 2. Create a community as admin
  const createCommunityInput = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      { body: createCommunityInput },
    );
  typia.assert(community);

  // 3.1. Query all invitations (should be empty at this point)
  const noInvitationsRes =
    await api.functional.communityPlatform.admin.communities.moderatorInvitations.index(
      connection,
      {
        communityId: community.id,
        body: { page: 0, limit: 20 },
      },
    );
  typia.assert(noInvitationsRes);
  TestValidator.equals(
    "initial invitations list is empty",
    noInvitationsRes.data.length,
    0,
  );
  TestValidator.equals(
    "initial page current is 0",
    noInvitationsRes.pagination.current,
    0,
  );
  TestValidator.equals(
    "initial page limit is 20",
    noInvitationsRes.pagination.limit,
    20,
  );
  TestValidator.equals(
    "initial records is 0",
    noInvitationsRes.pagination.records,
    0,
  );

  // 3.2. Query with random non-existent filters
  const nonExistFilterRes =
    await api.functional.communityPlatform.admin.communities.moderatorInvitations.index(
      connection,
      {
        communityId: community.id,
        body: {
          invitee_user_id: typia.random<string & tags.Format<"uuid">>(),
          status: "revoked",
          page: 0,
          limit: 5,
        },
      },
    );
  typia.assert(nonExistFilterRes);
  TestValidator.equals(
    "non-existent filter returns empty",
    nonExistFilterRes.data.length,
    0,
  );

  // (Optionally: More advanced filtering requires real invitations to exist; not doing that here since no invitation creation function exists in this scope.)

  // 3.3. Query with single oversized page
  const bigPageRes =
    await api.functional.communityPlatform.admin.communities.moderatorInvitations.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 0,
          limit: 100,
        },
      },
    );
  typia.assert(bigPageRes);
  TestValidator.equals(
    "oversized page still returns empty",
    bigPageRes.data.length,
    0,
  );
  TestValidator.equals(
    "oversized page limit is 100",
    bigPageRes.pagination.limit,
    100,
  );

  // 4. Confirm admin-only fields: since all lists are empty, check structure only
  TestValidator.equals(
    "pagination object structure valid",
    typeof bigPageRes.pagination,
    "object",
  );
  TestValidator.equals("data is array", Array.isArray(bigPageRes.data), true);

  // 5. Unauthenticated user cannot access admin endpoint
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot query moderator invitations",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderatorInvitations.index(
        unauthConn,
        {
          communityId: community.id,
          body: { page: 0, limit: 10 },
        },
      );
    },
  );
}
