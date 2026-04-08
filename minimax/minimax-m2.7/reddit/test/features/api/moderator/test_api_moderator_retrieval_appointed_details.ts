import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

export async function test_api_moderator_retrieval_appointed_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1 (owner) using authorize_member_join
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  // 2. Create a new community - member1 becomes owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate as member2 using authorize_member_join
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  // 4. Create moderator assignment for member2 using member2's ID
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      member1Connection,
      {
        body: {
          memberId: member2Auth.id,
          role: "moderator",
        } satisfies IRedditCloneCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Retrieve moderator details using member2's ID as the moderatorId
  const moderatorDetails =
    await api.functional.redditClone.member.communities.moderators.at(
      member2Connection,
      {
        communityId: community.id,
        moderatorId: member2Auth.id,
      },
    );
  typia.assert(moderatorDetails);
  // 6. Validate response structure
  TestValidator.equals(
    "moderator has correct counts",
    moderatorDetails.pendingReportsCount,
    0,
  );
  TestValidator.equals(
    "moderator has zero approved reports",
    moderatorDetails.approvedReportsCount,
    0,
  );
  TestValidator.equals(
    "moderator has zero dismissed reports",
    moderatorDetails.dismissedReportsCount,
    0,
  );
  TestValidator.equals(
    "moderator has zero active bans",
    moderatorDetails.activeBansCount,
    0,
  );
  TestValidator.equals(
    "no recent pending reports",
    moderatorDetails.recentPendingReports.length,
    0,
  );
  TestValidator.equals("no recent bans", moderatorDetails.recentBans.length, 0);
}
