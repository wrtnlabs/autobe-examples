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

export async function test_api_reddit_community_member_community_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Create a new member account by joining
  const memberAuthorized: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
        password: "securePassword123",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community to retrieve its details later
  const newCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(newCommunity);

  // 3. Retrieve the community details by the community ID
  const communityDetails: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.at(connection, {
      communityId: newCommunity.id,
    });
  typia.assert(communityDetails);

  // 4. Validate key fields correctness
  TestValidator.equals(
    "community ID matches created community",
    communityDetails.id,
    newCommunity.id,
  );
  TestValidator.equals(
    "community name matches created community",
    communityDetails.name,
    newCommunity.name,
  );
  TestValidator.equals(
    "community description matches created community",
    communityDetails.description,
    newCommunity.description,
  );
  TestValidator.predicate(
    "community creation timestamp is valid ISO datetime",
    typeof communityDetails.created_at === "string" &&
      communityDetails.created_at.length > 0,
  );
  TestValidator.predicate(
    "community update timestamp is valid ISO datetime",
    typeof communityDetails.updated_at === "string" &&
      communityDetails.updated_at.length > 0,
  );

  // 5. Test error handling for invalid community ID
  await TestValidator.error(
    "retrieving community with invalid UUID fails",
    async () => {
      await api.functional.redditCommunity.member.communities.at(connection, {
        communityId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );
}
