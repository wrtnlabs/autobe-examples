import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";

/**
 * Test that a community moderator can retrieve a paginated and filtered list of
 * all bans for a given community using its communityId.
 *
 * 1. The user registers as moderator (user join + gets token).
 * 2. Moderator user creates a new community.
 * 3. A second user is created for ban target.
 * 4. Admin registers as a platform admin and issues a community ban for the second
 *    user.
 * 5. Moderator lists bans via the target API with pagination and filter
 *    parameters.
 * 6. Confirms ban record contains correct metadata (banned user, banning
 *    moderator/admin, reason, timestamps).
 * 7. Confirms only permitted users (moderator/admin) can access, and user without
 *    permission cannot.
 * 8. Validates pagination/filtering work as expected.
 */
export async function test_api_community_bans_listing_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator registers as a user
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(10);
  const moderatorDisplayName = RandomGenerator.name();
  const moderatorJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      display_name: moderatorDisplayName,
      href: "https://community.test/join",
      referrer: "https://community.test/register",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(moderatorJoin);

  // 2. Moderator creates a new community
  const communityName = RandomGenerator.alphabets(10);
  const communityDescription = RandomGenerator.paragraph({ sentences: 8 });
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName as string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">,
        description: communityDescription as string &
          tags.MinLength<1> &
          tags.MaxLength<250>,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Ban target user registers
  const banUserEmail = typia.random<string & tags.Format<"email">>();
  const banUserPassword = RandomGenerator.alphaNumeric(12);
  const banUserDisplayName = RandomGenerator.name();
  const banTargetJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: banUserEmail,
      password: banUserPassword,
      display_name: banUserDisplayName,
      href: "https://community.test/join",
      referrer: "https://community.test/invite",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(banTargetJoin);

  // 4. Admin joins and issues community ban
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const adminDisplayName = RandomGenerator.name();
  // Switch to admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: "https://community.test/admin/join",
      referrer: "https://community.test/admin/invite",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // At this point, the connection carries admin Authorization header

  // Admin issues a ban on the banTargetJoin user for the community
  const banReason = RandomGenerator.paragraph({ sentences: 5 });
  const banExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // expires in 1 hour
  const banRecord =
    await api.functional.communityPlatform.admin.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_platform_user_id: banTargetJoin.id,
          reason: banReason,
          expires_at: banExpires,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banRecord);

  // 5. Switch back to moderator (user) session to query bans
  await api.functional.auth.user.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      display_name: moderatorDisplayName,
      href: "https://community.test/join",
      referrer: "https://community.test/register",
    } satisfies ICommunityPlatformUser.IJoin,
  });

  // 6. Moderator lists bans with basic pagination/filtering
  const bansPage =
    await api.functional.communityPlatform.user.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          user_id: banTargetJoin.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(bansPage);
  TestValidator.predicate(
    "ban page should contain the banned user",
    bansPage.data.some((ban) => ban.user.id === banTargetJoin.id),
  );

  // 7. The ban record should have correct metadata
  const foundBan = bansPage.data.find(
    (ban) => ban.user.id === banTargetJoin.id,
  );
  if (foundBan) {
    TestValidator.equals(
      "found ban - reason matches",
      foundBan.reason,
      banReason,
    );
    TestValidator.equals(
      "found ban - moderator/admin matches",
      foundBan.banned_by.display_name,
      adminDisplayName,
    );
    TestValidator.equals(
      "found ban - expiresAt matches",
      foundBan.expires_at,
      banExpires,
    );
    TestValidator.equals(
      "found ban - community id matches",
      foundBan.community.id,
      community.id,
    );
  } else {
    throw new Error("Banned user not found in bans page");
  }

  // 8. Pagination: list bans with different limit/page parameters
  const pagedBans2 =
    await api.functional.communityPlatform.user.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(pagedBans2);
  TestValidator.equals(
    "pagination page current is respected",
    pagedBans2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is respected",
    pagedBans2.pagination.limit,
    1,
  );

  // 9. Attempt with insufficient permissions (unauthenticated/other user)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-moderator user cannot list community bans",
    async () => {
      await api.functional.communityPlatform.user.communities.bans.index(
        unauthConn,
        {
          communityId: community.id,
          body: {
            user_id: banTargetJoin.id,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 5 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies ICommunityPlatformCommunityBan.IRequest,
        },
      );
    },
  );
}
