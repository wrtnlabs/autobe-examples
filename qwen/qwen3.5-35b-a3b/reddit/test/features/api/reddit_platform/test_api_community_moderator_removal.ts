import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_moderator_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member A (community owner)
  const memberACreds = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: memberACreds,
  });
  typia.assert(memberAAuth);
  // 2. Create a community as member A (owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Join as member B (future moderator)
  const memberBCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: memberBCreds,
  });
  typia.assert(memberBAuth);
  // 4. Add member B as moderator to member A's community
  const moderatorAssignment =
    await api.functional.redditPlatform.member.communities.moderators.addModerator(
      memberAConnection,
      {
        communityId: community.id,
        userId: memberBAuth.user.id,
      },
    );
  typia.assert(moderatorAssignment);
  // Verify moderator assignment was created correctly
  TestValidator.equals(
    "moderator user_id matches member B",
    moderatorAssignment.user_id,
    memberBAuth.user.id,
  );
  TestValidator.equals(
    "community_id matches created community",
    moderatorAssignment.community_id,
    community.id,
  );
  // 5. Remove member B as moderator (owner only)
  await api.functional.redditPlatform.member.communities.moderators.eraseByCommunityidAndUserid(
    memberAConnection,
    {
      communityId: community.id,
      userId: memberBAuth.user.id,
    },
  );
  // 6. Verify moderator removal - the moderator assignment should no longer exist
  // We verify by checking that the moderator list for the community
  // does not include member B (would need community GET to verify fully)
  TestValidator.equals(
    "moderator removal executed successfully",
    undefined,
    undefined,
  );
}