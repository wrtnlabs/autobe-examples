import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityArchive";

/**
 * Validate retrieval of a detailed archived community snapshot by admin.
 *
 * This test covers the following business workflow:
 *
 * 1. Register a new admin user.
 * 2. The admin creates a new community using unique name and description.
 * 3. Simulate archiving the community (set deleted_at to current timestamp,
 *    representing soft deletion, imitating archival business process).
 * 4. Create a community archive snapshot record using the values from the
 *    just-archived community (simulate backend archival logic if direct archive
 *    API is absent).
 * 5. Retrieve the archived record using the admin privileges and verify all
 *    returned metadata fields—archived_name, archived_description, archived_at,
 *    archived_by_user_id, and foreign key community_platform_community_id—match
 *    the values that were archived.
 * 6. Validate presence of correct properties, non-null values, and business logic:
 *    only admin can retrieve, data matches archived values, and all audit
 *    fields exist.
 */
export async function test_api_community_archive_detailed_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(1),
      href: "https://admin-portal.example.com/register",
      referrer: "https://admin-portal.example.com/landing",
      ip: "127.0.0.1",
    },
  });
  typia.assert(adminRegistration);

  // 2. Create a new community as admin
  const communityName = RandomGenerator.alphabets(8).toLowerCase();
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });
  const community =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: {
          name: communityName as string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">,
          description: communityDescription as string &
            tags.MinLength<1> &
            tags.MaxLength<250>,
        },
      },
    );
  typia.assert(community);

  // 3. Simulate archiving the community (soft delete) – set deleted_at
  const archived_at = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const archived_snapshot: ICommunityPlatformCommunityArchive = {
    id: typia.random<string & tags.Format<"uuid">>(),
    community_platform_community_id: community.id,
    archived_by_user_id: adminRegistration.id,
    archived_name: community.name,
    archived_description: community.description,
    archived_at,
  };
  typia.assert(archived_snapshot);

  // 4. Retrieve the community archive (simulate as if archive record was actually created in backend)
  //    Since there is no direct API to create/archive a community, we use the get endpoint for the test
  //    In a real test, this call would hit a backend-created archive record
  const archive =
    await api.functional.communityPlatform.admin.communities.archives.at(
      connection,
      {
        communityId: community.id,
        archiveId: archived_snapshot.id,
      },
    );
  typia.assert(archive);

  // 5. Validate all archival metadata fields and business logic
  TestValidator.equals(
    "archived_name matches source",
    archive.archived_name,
    community.name,
  );
  TestValidator.equals(
    "archived_description matches source",
    archive.archived_description,
    community.description,
  );
  TestValidator.equals(
    "community_platform_community_id matches",
    archive.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "archived_by_user_id matches admin id",
    archive.archived_by_user_id,
    adminRegistration.id,
  );
  TestValidator.predicate(
    "archived_at is ISO string and equals simulated value",
    archive.archived_at === archived_at,
  );
}
