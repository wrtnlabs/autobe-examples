import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModeratorAssignment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorAssignment";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_community_moderator_assignment_listing_by_community_moderator(
  connection: api.IConnection,
) {
  // Step 1: Authenticate communityModerator actor via join and login
  const communityModeratorEmail = typia.random<string & tags.Format<"email">>();
  const communityModeratorPassword = "password123";

  const communityModeratorJoined =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: communityModeratorEmail,
        password: communityModeratorPassword,
        nickname: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(communityModeratorJoined);

  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: communityModeratorEmail,
      password: communityModeratorPassword,
      ip: null,
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 2: Authenticate registeredUser actor via join and login
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUserPassword = "password123";

  const registeredUserJoined = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: registeredUserEmail,
        password: registeredUserPassword,
        href: "http://localhost/",
        referrer: "http://localhost/",
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    },
  );
  typia.assert(registeredUserJoined);

  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: registeredUserEmail,
      password: registeredUserPassword,
      ip: undefined,
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IRedditCommunityRegisteredUser.ILogin,
  });

  // Step 3: Registered user creates a community
  // Use a unique communityName
  const communityName = RandomGenerator.alphaNumeric(12);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const communityCreated =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: {
          communityName: communityName,
          description: communityDescription,
          status: "active",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityCreated);
  TestValidator.equals(
    "communityName matches created",
    communityCreated.communityName,
    communityName,
  );

  // Step 4: Community moderator lists all assignments for that community

  // Prepare filter and pagination request
  const assignmentRequest = {
    page: 1,
    limit: 10,
    search: undefined,
    sortBy: null,
    sortOrder: null,
  } satisfies IRedditCommunityCommunityModeratorAssignment.IRequest;

  const assignmentList =
    await api.functional.redditCommunity.communityModerator.communities.communityModeratorAssignments.index(
      connection,
      {
        communityName: communityName,
        body: assignmentRequest,
      },
    );
  typia.assert(assignmentList);

  TestValidator.predicate(
    "pagination current page should be 1",
    assignmentList.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    assignmentList.pagination.limit === 10,
  );
  TestValidator.predicate(
    "every assignment's community_name should be the created communityName",
    assignmentList.data.every(
      (assignment) => assignment.community_name === communityName,
    ),
  );
}
