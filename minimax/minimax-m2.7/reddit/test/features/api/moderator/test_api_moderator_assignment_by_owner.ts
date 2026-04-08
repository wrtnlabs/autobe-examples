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

export async function test_api_moderator_assignment_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two new member accounts
  // Owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `owner_${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // Future moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: `mod_${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // 2. Owner creates a new community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(12)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Verify the community is created and owner role is assigned automatically
  TestValidator.equals("owner is the creator", community.member.id, owner.id);
  // 4. Owner assigns the second member as a moderator
  const moderatorAssignment =
    await api.functional.redditClone.member.communities.moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          memberId: moderator.id,
          role: "moderator",
        } satisfies IRedditCloneCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Validate moderator assignment response structure
  TestValidator.predicate(
    "has valid pending reports count",
    moderatorAssignment.pendingReportsCount >= 0,
  );
  TestValidator.predicate(
    "has valid approved reports count",
    moderatorAssignment.approvedReportsCount >= 0,
  );
  TestValidator.predicate(
    "has valid dismissed reports count",
    moderatorAssignment.dismissedReportsCount >= 0,
  );
  TestValidator.predicate(
    "has valid active bans count",
    moderatorAssignment.activeBansCount >= 0,
  );
  TestValidator.predicate(
    "recent pending reports is array",
    Array.isArray(moderatorAssignment.recentPendingReports),
  );
  TestValidator.predicate(
    "recent bans is array",
    Array.isArray(moderatorAssignment.recentBans),
  );
}
