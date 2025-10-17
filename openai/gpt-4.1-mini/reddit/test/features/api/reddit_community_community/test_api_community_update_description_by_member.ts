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
 * Validate the update of a reddit community's description by an authenticated
 * member user.
 *
 * This test performs the entire update lifecycle, including:
 *
 * 1. Member registration with email and password via the /auth/member/join
 *    endpoint.
 * 2. Community creation with a unique name and optional description via
 *    /redditCommunity/member/communities.
 * 3. Update the community description with valid new content using PUT
 *    /redditCommunity/member/communities/{communityId}.
 * 4. Verify that the updated community data is returned with the new description
 *    and all other fields unchanged.
 * 5. Confirm that only authenticated members can update the community;
 *    unauthorized attempts are rejected.
 * 6. Handle cases of invalid community IDs, invalid description values, and
 *    unauthorized update attempts with proper error detection.
 *
 * The test uses realistic random values respecting all constraints such as UUID
 * format, date-time ISO strings, and name uniqueness rules.
 *
 * @param connection An API connection instance from the test runner.
 */
export async function test_api_community_update_description_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!";
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new community with a unique name and optional description
  const communityName = RandomGenerator.alphabets(10);
  const communityDescription = RandomGenerator.content({ paragraphs: 2 });
  const communityCreated: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityCreated);
  TestValidator.equals(
    "community name matches",
    communityCreated.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches",
    communityCreated.description ?? "",
    communityDescription,
  );

  // 3. Update the community description
  const newDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.updateCommunity(
      connection,
      {
        communityId: communityCreated.id,
        body: {
          description: newDescription,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // 4. Validate updated description and that immutable fields remain unchanged
  TestValidator.equals(
    "updated community id matches",
    updatedCommunity.id,
    communityCreated.id,
  );
  TestValidator.equals(
    "community name unchanged",
    updatedCommunity.name,
    communityCreated.name,
  );
  TestValidator.equals(
    "community description updated",
    updatedCommunity.description ?? "",
    newDescription,
  );
  TestValidator.equals(
    "community created_at unchanged",
    updatedCommunity.created_at,
    communityCreated.created_at,
  );

  // 5. Validate authorization enforcement by attempting update without authenticated member
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.redditCommunity.member.communities.updateCommunity(
      unauthConn,
      {
        communityId: communityCreated.id,
        body: {
          description: "Attempted unauthorized update",
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  });

  // 6. Validate error for invalid communityId
  await TestValidator.error(
    "update with invalid communityId should fail",
    async () => {
      await api.functional.redditCommunity.member.communities.updateCommunity(
        connection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            description: "This should fail",
          } satisfies IRedditCommunityCommunity.IUpdate,
        },
      );
    },
  );

  // 7. Validate error for invalid description (empty string) - optional, assuming description validation disallows empty string
  await TestValidator.error(
    "update with empty description should fail",
    async () => {
      await api.functional.redditCommunity.member.communities.updateCommunity(
        connection,
        {
          communityId: communityCreated.id,
          body: {
            description: "",
          } satisfies IRedditCommunityCommunity.IUpdate,
        },
      );
    },
  );
}
