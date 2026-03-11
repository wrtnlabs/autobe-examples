import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
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
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_moderator_history_removal_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join and authenticate as community owner (Member A)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234password",
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a new community as owner
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Join as different member (Member B) who will become moderator
  const moderatorUserConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234password",
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Use owner's session to add Member B as community moderator
  // This creates an APPOINTED history record
  const moderatorAssignment =
    await api.functional.redditPlatform.member.communities.moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          user_id: moderatorAuth.user.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Use owner's session to remove Member B's moderator role
  // This creates a REMOVED history record
  await api.functional.redditPlatform.member.communities.moderators.eraseByCommunityidAndUserid(
    ownerConnection,
    {
      communityId: community.id,
      userId: moderatorAuth.user.id,
    },
  );
  // 6. Retrieve the APPOINTED moderator history record to validate structure
  const historyRecord =
    await api.functional.redditPlatform.member.communities.moderator_histories.at(
      ownerConnection,
      {
        communityId: community.id,
        historyId: moderatorAssignment.id,
      },
    );
  typia.assert(historyRecord);
  // 7. Validate the history record structure
  TestValidator.equals(
    "action type is APPOINTED",
    historyRecord.action_type,
    "APPOINTED",
  );
  TestValidator.equals(
    "community_id matches",
    historyRecord.community.id,
    community.id,
  );
  TestValidator.equals(
    "user_id matches moderator user",
    historyRecord.user.id,
    moderatorAuth.user.id,
  );
  TestValidator.equals(
    "acted_by is the owner",
    historyRecord.acted_by?.id,
    ownerAuth.user.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(new Date(historyRecord.created_at).getTime()),
  );
}
