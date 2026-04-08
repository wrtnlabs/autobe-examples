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
import type { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
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

export async function test_api_moderator_snapshot_retrieval_for_appointed_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Register a regular member who will be appointed as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {});
  // 3. Owner creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Owner appoints the member as moderator
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Retrieve the moderator snapshot using moderator ID as snapshot ID
  // Note: The snapshot ID corresponds to the moderator assignment ID
  const snapshot =
    await api.functional.redditClone.member.communities.moderators.snapshots.at(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderatorMember.id,
        snapshotId: moderatorMember.id,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot contains correct data for appointed moderator
  // Role should be 'moderator' (not 'owner')
  TestValidator.equals("role is moderator", snapshot.role, "moderator");
  // assignedByUserId should match owner's member ID (assigned by owner)
  TestValidator.equals(
    "assigned by owner",
    snapshot.assignedByUserId,
    owner.id,
  );
  // Community reference should match
  TestValidator.equals(
    "community ID matches",
    snapshot.redditCloneCommunityId,
    community.id,
  );
  // Member reference should match the appointed moderator
  TestValidator.equals(
    "member ID matches",
    snapshot.redditCloneMemberId,
    moderatorMember.id,
  );
  // The moderator reference should have correct role
  TestValidator.equals(
    "moderator role is correct",
    snapshot.moderator.role,
    "moderator",
  );
  // Timestamps should be valid ISO date-time strings
  TestValidator.predicate(
    "assignedAt is valid timestamp",
    snapshot.assignedAt.length > 0,
  );
  TestValidator.predicate(
    "createdAt is valid timestamp",
    snapshot.createdAt.length > 0,
  );
  // Snapshot should be immutable audit record
  TestValidator.equals(
    "role is immutable in snapshot",
    snapshot.role,
    "moderator",
  );
}