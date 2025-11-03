import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorInvitation";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorInvitation";

/**
 * E2E test for pagination and filtering of moderator invitations. Steps:
 *
 * 1. Register and authenticate a member user (userA)
 * 2. Create a community as userA (userA becomes moderator)
 * 3. Search for moderator invitations as userA (should be allowed; likely none at
 *    start)
 * 4. Register a second user (userB, to test unauthorized access and simulate as
 *    invitee filter)
 * 5. Attempt to search as non-moderator (userB; should not be allowed)
 * 6. If invitations existed, perform pagination and filtering tests (status,
 *    invitee, inviter, etc.) Since no invitation-creation endpoint is
 *    available, this test is limited to empty/no result case.
 */
export async function test_api_user_moderator_invitations_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as userA (moderator)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://test.community/join",
      referrer: "https://test.community/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAJoin);

  // 2. UserA creates a community
  const communityName = RandomGenerator.alphaNumeric(16).toLowerCase();
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName satisfies string as string,
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }) satisfies string as string,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. As moderator, search for own community's invitations (expecting none)
  const getInvitations = async (
    filterReq: Partial<ICommunityPlatformCommunityModeratorInvitation.IRequest> = {},
  ) => {
    const response =
      await api.functional.communityPlatform.user.communities.moderatorInvitations.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: 0,
            limit: 10,
            ...filterReq,
          } satisfies ICommunityPlatformCommunityModeratorInvitation.IRequest,
        },
      );
    typia.assert(response);
    return response;
  };
  const page = await getInvitations();
  TestValidator.equals(
    "initial invitations should be empty",
    page.data.length,
    0,
  );

  // 4. Register a second user (userB)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://test.community/join",
      referrer: "https://test.community/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userBJoin);

  // 5. Switch context to userB by authenticating (token updates connection)
  // Note: No separate login endpoint provided. userB is now authenticated.

  // 6. userB attempts unauthorized search on userA's community
  await TestValidator.error(
    "unauthorized user cannot access moderator invitations",
    async () => {
      await api.functional.communityPlatform.user.communities.moderatorInvitations.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: 0,
            limit: 10,
          } satisfies ICommunityPlatformCommunityModeratorInvitation.IRequest,
        },
      );
    },
  );
}
