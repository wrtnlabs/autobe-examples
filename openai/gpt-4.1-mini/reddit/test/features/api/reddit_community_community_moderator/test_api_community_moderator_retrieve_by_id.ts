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

export async function test_api_community_moderator_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new communityModerator user
  const communityModeratorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityCommunityModerator.IJoin;

  const communityModeratorRegistered: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: communityModeratorJoinBody,
      },
    );
  typia.assert(communityModeratorRegistered);

  // 2. Login as the registered communityModerator
  const communityModeratorLoginBody = {
    email: communityModeratorJoinBody.email,
    password: communityModeratorJoinBody.password,
  } satisfies IRedditCommunityCommunityModerator.ILogin;

  const communityModeratorLoggedIn: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login.loginCommunityModerator(
      connection,
      {
        body: communityModeratorLoginBody,
      },
    );
  typia.assert(communityModeratorLoggedIn);

  // 3. Register a new member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;

  const memberRegistered: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberRegistered);

  // 4. Login as member user
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
  } satisfies IRedditCommunityMember.ILogin;

  const memberLoggedIn: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 5. Create a new community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const communityCreated: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(communityCreated);

  // 6. Register admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityAdmin.ICreate;

  const adminRegistered: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminRegistered);

  // 7. Login admin user
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IRedditCommunityAdmin.ILogin;

  const adminLoggedIn: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 8. Switch connection to admin user for assignment
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // 9. Assign communityModerator as moderator of the created community
  const assignModeratorBody = {
    member_id: communityModeratorRegistered.id,
    community_id: communityCreated.id,
    assigned_at: new Date().toISOString(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: communityCreated.id,
      body: assignModeratorBody,
    },
  );

  // 10. Switch connection to communityModerator user for retrieval
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: communityModeratorLoginBody,
    },
  );

  // 11. Retrieve communityModerator details by communityId and moderatorId
  const retrievedModerator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.communityModerator.communities.communityModerators.at(
      connection,
      {
        communityId: communityCreated.id,
        moderatorId: communityModeratorRegistered.id,
      },
    );
  typia.assert(retrievedModerator);

  // 12. Validate retrieved data
  TestValidator.equals(
    "retrieved moderator id check",
    retrievedModerator.id,
    communityModeratorRegistered.id,
  );
  TestValidator.equals(
    "retrieved moderator email check",
    retrievedModerator.email,
    communityModeratorRegistered.email,
  );
  TestValidator.equals(
    "retrieved moderator email verification status check",
    retrievedModerator.is_email_verified,
    communityModeratorRegistered.is_email_verified,
  );
  TestValidator.predicate(
    "retrieved moderator created_at is valid",
    !!retrievedModerator.created_at,
  );
  TestValidator.predicate(
    "retrieved moderator updated_at is valid",
    !!retrievedModerator.updated_at,
  );
}
