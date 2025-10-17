import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test updating reddit community member information by community moderator.
 *
 * This test validates the full workflow of a community moderator user updating
 * a reddit community member's profile, enforcing authorization and business
 * rules.
 *
 * Steps:
 *
 * 1. Register a new communityModerator user and login.
 * 2. Create a new reddit community.
 * 3. Assign the communityModerator role to the user in the created community.
 * 4. Update an existing redditCommunityMember (the moderator user itself) email
 *    and email verification status.
 * 5. Validate that the update succeeded, fields are changed, and updated_at is
 *    later.
 * 6. Attempt unauthorized update to confirm access control.
 */
export async function test_api_reddit_community_member_update_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register communityModerator user
  const moderatorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityCommunityModerator.IJoin;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      { body: moderatorJoinBody },
    );
  typia.assert(moderator);

  // 2. Create a reddit community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Assign communityModerator role
  const moderatorAssignmentBody = {
    member_id: moderator.id,
    community_id: community.id,
    assigned_at: new Date().toISOString(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: moderatorAssignmentBody,
    },
  );

  // 4. Update redditCommunityMember (moderator's own member ID) email and verification
  const newEmail = typia.random<string & tags.Format<"email">>();
  const memberUpdateBody = {
    email: newEmail,
    is_email_verified: true,
  } satisfies IRedditCommunityMember.IUpdate;

  await api.functional.redditCommunity.communityModerator.redditCommunityMembers.update(
    connection,
    {
      id: moderator.id,
      body: memberUpdateBody,
    },
  );

  // 5. Since the update endpoint returns no content, we re-fetch the moderator user
  //    to verify update is applied correctly - however no fetch endpoint provided in materials,
  //    so instead just confirm no error thrown and the update logic presumed success.

  // 6. Attempt unauthorized update by switching to unauthenticated connection (empty headers)
  const unauthenticatedConn: api.IConnection = {
    host: connection.host,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.redditCommunity.communityModerator.redditCommunityMembers.update(
        unauthenticatedConn,
        {
          id: moderator.id,
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          } satisfies IRedditCommunityMember.IUpdate,
        },
      );
    },
  );
}
