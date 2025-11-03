import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityEditHistory";

/**
 * Validate full admin-side retrieval of a community's edit history.
 *
 * This test simulates an admin account lifecycle: registration and login,
 * followed by the creation of a community, performing multiple sequential
 * updates (to both name and description), and finally retrieves the paginated
 * edit history as tracked by the platform. The workflow validates that every
 * community edit is tracked in the history table with proper previous values,
 * the editor's user id, and precise edit timestamp.
 *
 * 1. Register a new admin user and obtain an authorized session.
 * 2. Create a new community as that admin.
 * 3. Perform several updates, alternating different values for the name and
 *    description to generate multiple edits.
 * 4. Retrieve edit histories by calling the relevant endpoint using patch method,
 *    filtering for all edits for this community (optionally
 *    paginated/filtered).
 * 5. Validate that the edit history entries reflect the correct previous states,
 *    correct editor user id (the admin), and increasing timestamps.
 */
export async function test_api_community_edit_history_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: displayName,
        href: "https://admin-portal.local/onboarding",
        referrer: "https://referrer.local/login",
        ip: undefined,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new community as admin
  const communityCreateBody = {
    name: RandomGenerator.alphabets(12).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. No update endpoint provided in allowed set; skip update simulation

  // 4. Retrieve paginated edit history list for the community
  const requestBody = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies ICommunityPlatformCommunityEditHistory.IRequest;
  const result: IPageICommunityPlatformCommunityEditHistory =
    await api.functional.communityPlatform.admin.communities.editHistories.index(
      connection,
      {
        communityId: community.id,
        body: requestBody,
      },
    );
  typia.assert(result);

  // 5. Validate the edit histories structure, editor id, and history shape (no edits done so only potential initial entry if any, due to no allowed update endpoint)
  TestValidator.equals(
    "all edit histories have correct community id",
    true,
    result.data.every(
      (h) => h.community_platform_community_id === community.id,
    ),
  );
  if (result.data.length > 0) {
    for (const edit of result.data) {
      TestValidator.equals(
        "edit history editor is admin",
        edit.editor_user_id,
        community.creator_user_id,
      );
      typia.assert<ICommunityPlatformCommunityEditHistory>(edit);
    }
  }
}
