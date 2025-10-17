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
import type { IRedditCommunityCommunityModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerators";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Test retrieval of detailed information for a specific community moderator by
 * an admin user.
 *
 * This test covers the end-to-end scenario:
 *
 * 1. Admin user registration (join) to obtain admin credentials and token.
 * 2. Member user registration (join) to create a community member.
 * 3. Member creates a community.
 * 4. Admin assigns the member as a community moderator to the community.
 * 5. Admin retrieves the detailed information of the assigned community moderator.
 *
 * Validations ensure the retrieved community moderator's details accurately
 * include member ID, community ID, assignment timestamp, and creation/update
 * audit timestamps. Each stage uses valid request bodies adhering to schema
 * constraints and realistic data.
 */
export async function test_api_community_moderator_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join) to authenticate and get token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "topstrongpassword123!",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Member user registration (join) to create a community member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "memberpassword456$",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 3. Member creates a community
  const communityName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  }).replaceAll(" ", "_");
  const communityDesc = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 10,
    wordMax: 20,
  });

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: communityDesc,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Admin assigns the member as community moderator
  const assignedAt = new Date().toISOString();
  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: {
        member_id: member.id,
        community_id: community.id,
        assigned_at: assignedAt,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  // 5. Admin retrieves the detailed community moderator info by ID
  // NOTE: Due to lack of moderator listing API, using member.id as proxy for moderator id
  const moderatorDetails: IRedditCommunityCommunityModerators =
    await api.functional.redditCommunity.admin.redditCommunityCommunityModerators.at(
      connection,
      { id: member.id },
    );
  typia.assert(moderatorDetails);

  // Validate the retrieved details contain correct assigned member and community IDs
  TestValidator.equals(
    "retrieved moderator member_id matches assigned member id",
    moderatorDetails.member_id,
    member.id,
  );
  TestValidator.equals(
    "retrieved moderator community_id matches assigned community id",
    moderatorDetails.community_id,
    community.id,
  );
  TestValidator.equals(
    "retrieved moderator assigned_at matches assigned timestamp",
    moderatorDetails.assigned_at,
    assignedAt,
  );

  // Validate that created_at and updated_at timestamps are present and correct ISO date strings
  TestValidator.predicate(
    "moderator created_at is valid ISO date-time",
    typeof moderatorDetails.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*/.test(
        moderatorDetails.created_at,
      ),
  );
  TestValidator.predicate(
    "moderator updated_at is valid ISO date-time",
    typeof moderatorDetails.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*/.test(
        moderatorDetails.updated_at,
      ),
  );
}
