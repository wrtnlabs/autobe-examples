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

export async function test_api_reddit_community_member_community_update_description(
  connection: api.IConnection,
) {
  // 1. Register a new member (join)
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create a new community with a unique name
  const communityCreateBody = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Update the community's description
  const newDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 6,
    wordMax: 10,
  });
  const updateBody = {
    description: newDescription,
  } satisfies IRedditCommunityCommunity.IUpdate;
  const updatedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.updateCommunity(
      connection,
      { communityId: community.id, body: updateBody },
    );
  typia.assert(updatedCommunity);

  // 4. Validate that the description was updated, but name is unchanged
  TestValidator.equals(
    "community name should remain unchanged",
    updatedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community description should be updated",
    updatedCommunity.description,
    newDescription,
  );
}
