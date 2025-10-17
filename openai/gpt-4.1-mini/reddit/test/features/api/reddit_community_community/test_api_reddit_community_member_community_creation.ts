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

export async function test_api_reddit_community_member_community_creation(
  connection: api.IConnection,
) {
  // 1. Register a new member with random email and password
  const email: string = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const password: string = RandomGenerator.alphaNumeric(12);

  const newMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(newMember);

  // 2. Compose community creation parameters
  const communityName: string = `testcommunity_${RandomGenerator.alphaNumeric(5)}`;
  const communityDescription: string = RandomGenerator.paragraph({
    sentences: 5,
  });

  // 3. Create a new community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Validate the returned community data
  TestValidator.equals("community name", community.name, communityName);
  TestValidator.equals(
    "community description",
    community.description,
    communityDescription,
  );
  TestValidator.predicate(
    "community has valid id",
    typeof community.id === "string" && community.id.length > 0,
  );
  TestValidator.predicate(
    "community created_at in date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(
      community.created_at,
    ),
  );
  TestValidator.predicate(
    "community updated_at in date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(
      community.updated_at,
    ),
  );

  // 5. Test unauthorized access with empty headers connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized creation fails", async () => {
    await api.functional.redditCommunity.member.communities.createCommunity(
      unauthConn,
      {
        body: {
          name: `unauth_${RandomGenerator.alphaNumeric(5)}`,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  });
}
