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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_moderation_dashboard_access_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new community (user automatically becomes owner)
  const community = await api.functional.redditClone.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Access the moderation dashboard with the community ID
  const dashboard =
    await api.functional.redditClone.member.communities.moderation.dashboard(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(dashboard);
  // 4. Validate dashboard structure matches IRedditCloneCommunityModerator
  TestValidator.equals(
    "pendingReportsCount is 0 for new community",
    dashboard.pendingReportsCount,
    0,
  );
  TestValidator.equals(
    "approvedReportsCount is 0 for new community",
    dashboard.approvedReportsCount,
    0,
  );
  TestValidator.equals(
    "dismissedReportsCount is 0 for new community",
    dashboard.dismissedReportsCount,
    0,
  );
  TestValidator.equals(
    "activeBansCount is 0 for new community",
    dashboard.activeBansCount,
    0,
  );
  TestValidator.equals(
    "recentPendingReports is empty array",
    dashboard.recentPendingReports.length,
    0,
  );
  TestValidator.equals(
    "recentBans is empty array",
    dashboard.recentBans.length,
    0,
  );
}
