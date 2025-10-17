import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

export async function test_api_appeal_retrieval_for_community_ban(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will be banned and appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community where ban will be issued
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 15 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create moderator account for ban enforcement
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Assign moderator to community with manage_users permission
  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_users,manage_posts",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 5: Issue community ban to the member
  const ban = await api.functional.redditLike.moderator.communities.bans.create(
    connection,
    {
      communityId: community.id,
      body: {
        banned_member_id: member.id,
        ban_reason_category: "harassment",
        ban_reason_text: RandomGenerator.paragraph({ sentences: 10 }),
        is_permanent: false,
        expiration_date: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies IRedditLikeCommunityBan.ICreate,
    },
  );
  typia.assert(ban);

  // Step 6: Member creates and submits appeal for the community ban
  const appealText = RandomGenerator.paragraph({
    sentences: 20,
    wordMin: 3,
    wordMax: 7,
  });
  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          community_ban_id: ban.id,
          appeal_type: "community_ban",
          appeal_text: appealText.substring(0, 1000),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 7: Moderator retrieves the ban appeal details
  const retrievedAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.at(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);

  // Step 8: Validate appeal contains complete information
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "appeal type is community_ban",
    retrievedAppeal.appeal_type,
    "community_ban",
  );
  TestValidator.equals(
    "appellant member ID matches",
    retrievedAppeal.appellant_member_id,
    member.id,
  );
  TestValidator.predicate(
    "appeal text length is valid",
    retrievedAppeal.appeal_text.length >= 50 &&
      retrievedAppeal.appeal_text.length <= 1000,
  );
  TestValidator.equals(
    "appeal status is pending",
    retrievedAppeal.status,
    "pending",
  );
}
