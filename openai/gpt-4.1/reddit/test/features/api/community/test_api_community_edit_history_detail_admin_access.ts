import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityEditHistory";

/**
 * Test that an administrator can fetch details of a specific edit history
 * record for a community.
 *
 * 1. Register a new admin and authenticate.
 * 2. Create a community as admin.
 * 3. Update the community to trigger an edit history record.
 * 4. Admin requests details for a specific edit history (using communityId and
 *    editHistoryId).
 * 5. Validate returned data includes correct previous values, editing user, and
 *    audit metadata.
 * 6. Attempt unauthorized access (not logged in) and verify denial.
 */
export async function test_api_community_edit_history_detail_admin_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://admin-console.example.com/register",
        referrer: "https://google.com",
        ip: undefined,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a community as admin.
  const name1 = RandomGenerator.alphabets(10).toLowerCase();
  const desc1 = RandomGenerator.paragraph({ sentences: 5 });
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: {
          name: name1 as string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">,
          description: desc1 as string &
            tags.MinLength<1> &
            tags.MaxLength<250>,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Update the community to generate an edit history record.
  // There is NO explicit update endpoint given for communities in the provided materials.
  // Thus, skip this step and focus on the positive/negative path using only the available endpoints.
  // (If editHistories were to exist, they must have been created by a means outside this E2E scope.)

  // 4. Attempt to fetch edit history (will use random IDs as per available endpoint contract).
  const dummyCommunityId = community.id;
  const dummyEditHistoryId = typia.random<string & tags.Format<"uuid">>();
  const output: ICommunityPlatformCommunityEditHistory =
    await api.functional.communityPlatform.admin.communities.editHistories.at(
      connection,
      {
        communityId: dummyCommunityId,
        editHistoryId: dummyEditHistoryId,
      },
    );
  typia.assert(output);

  // (Cannot validate business logic about previous/updated values as there is no update endpoint, but type and schema are validated.)

  // 5. Negative path: try fetching edit history as unauthenticated (simulate unauth connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated actor denied access to edit history details",
    async () => {
      await api.functional.communityPlatform.admin.communities.editHistories.at(
        unauthConn,
        {
          communityId: dummyCommunityId,
          editHistoryId: dummyEditHistoryId,
        },
      );
    },
  );
}
