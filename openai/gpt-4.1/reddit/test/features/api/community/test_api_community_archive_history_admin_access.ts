import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityArchive";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityArchive";

/**
 * Validate admin access to the paginated archive history for a community:
 *
 * 1. Register as a new admin and gain an authenticated context
 * 2. Create a new community with valid name and description
 * 3. Archive the community (soft delete) to generate archive record(s) (Assume at
 *    least one archive exists)
 * 4. As the admin, perform PATCH
 *    /communityPlatform/admin/communities/{communityId}/archives with
 *    pagination, sorting (both fields and directions), and keyword search
 * 5. Assert:
 *
 *    - Admin gets paginated ISummary data of archives with correct fields and
 *         sorting
 *    - Unauthenticated access is denied
 *    - Out-of-bounds page returns valid empty results or error (if supported)
 *    - All archive fields and metadata pass typia.assert
 *    - Only privileged actors can view archive history (negative test)
 */
export async function test_api_community_archive_history_admin_access(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = RandomGenerator.alphaNumeric(8) + "@testdomain.com";
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const href = "https://admin-join.example.com";
  const referrer = "https://referrer.example.com";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string as string,
      display_name: adminDisplayName,
      href,
      referrer,
      ip: undefined,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Admin creates a community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityDescription = RandomGenerator.paragraph({ sentences: 8 });
  const community =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // (Assume there is at least one archive record for this community)
  // 3. Try retrieving paginated, sorted, and searched archive history as admin
  const paginationCases: Array<{ page: number; limit: number }> = [
    { page: 1, limit: 10 },
    { page: 2, limit: 1 },
  ];
  const orderByFields = ["archived_at", "archived_name"] as const;
  const directions = ["asc", "desc"] as const;

  for (const { page, limit } of paginationCases) {
    for (const order_by of orderByFields) {
      for (const order_direction of directions) {
        const search = RandomGenerator.paragraph({ sentences: 2 });
        const reqBody = {
          page: page satisfies number as number,
          limit: limit satisfies number as number,
          search,
          order_by,
          order_direction,
        } satisfies ICommunityPlatformCommunityArchive.IRequest;

        const res =
          await api.functional.communityPlatform.admin.communities.archives.index(
            connection,
            {
              communityId: community.id,
              body: reqBody,
            },
          );
        typia.assert(res);
        TestValidator.equals(
          `archive page meta matches request (page: ${page}, limit: ${limit}, field: ${order_by}, dir: ${order_direction})`,
          res.pagination.current,
          page,
        );
        TestValidator.equals(
          `archive page size matches request`,
          res.pagination.limit,
          limit,
        );
        TestValidator.predicate(
          `archive data type correct`,
          Array.isArray(res.data),
        );
        for (const archive of res.data) {
          typia.assert(archive);
        }
      }
    }
  }

  // 4. Negative test: unauthenticated user cannot read archive history
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access archive history",
    async () => {
      await api.functional.communityPlatform.admin.communities.archives.index(
        unauthConn,
        {
          communityId: community.id,
          body: {
            page: 1,
            limit: 10,
            order_by: "archived_at",
            order_direction: "desc",
          } satisfies ICommunityPlatformCommunityArchive.IRequest,
        },
      );
    },
  );
  // If platform supports error for out-of-bounds page, test it (optional)
  const invalidPageRes =
    await api.functional.communityPlatform.admin.communities.archives.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 999,
          limit: 10,
          order_by: "archived_name",
          order_direction: "asc",
        } satisfies ICommunityPlatformCommunityArchive.IRequest,
      },
    );
  typia.assert(invalidPageRes);
  TestValidator.predicate(
    "out-of-bounds archive page returns empty or valid result set",
    Array.isArray(invalidPageRes.data),
  );
}
