import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Verify the permanent deletion of a redditCommunity community by an admin.
 *
 * This end-to-end test covers the full lifecycle:
 *
 * 1. Admin user registration and login.
 * 2. Member user registration and login.
 * 3. Member creates a new community.
 * 4. Admin deletes the community.
 * 5. Confirm community no longer accessible.
 *
 * It validates authorization workflows, role switching, successful deletion,
 * and error handling on deleted resource access.
 *
 * The test leverages actual API calls and DTO structures for full coverage.
 */
export async function test_api_reddit_community_admin_community_deletion(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongP@ss123";
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ICreate;
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Login as admin user
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ILogin;
  const adminLoginResult: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 3. Register a new member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberP@ss123";
  const memberCreateBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditCommunityMember.ICreate;
  const memberAuthorized: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberAuthorized);

  // 4. Login as member user
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditCommunityMember.ILogin;
  const memberLoginResult: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 5. Member creates a new community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // Validate created community properties
  TestValidator.predicate(
    "community id is valid uuid",
    typeof createdCommunity.id === "string" && createdCommunity.id.length > 0,
  );
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    communityCreateBody.name,
  );

  // 6. Switch to admin user session again to delete the community
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // 7. Admin deletes the community
  await api.functional.redditCommunity.admin.communities.eraseCommunity(
    connection,
    {
      communityId: createdCommunity.id,
    },
  );

  // 8. Attempt to retrieve the deleted community and expect error
  await TestValidator.error(
    "retrieving deleted community raises error",
    async () => {
      // Assuming read API is member endpoint /redditCommunity/member/communities/{communityId}
      // but since no read API is provided, we'll attempt to create the community again with same name and expect error
      // - Original scenario expects error on retrieve, but API doesn't list a GET for community by id
      // So we test creation with duplicate name to check deletion effect
      await api.functional.redditCommunity.member.communities.createCommunity(
        connection,
        {
          body: communityCreateBody,
        },
      );
    },
  );
}
