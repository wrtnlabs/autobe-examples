import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModeratorSnapshot";
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

/**
 * Test that a member without moderator authority in a community cannot query moderator snapshots.
 * This validates authorization rules - only moderators and owners can access snapshot history.
 *
 * Test Steps:
 * 1. Member A joins and creates Community A (becomes owner)
 * 2. Member B joins but is NOT a moderator of Community A
 * 3. Member C joins and creates Community B (becomes owner of separate community)
 * 4. Member C appoints a moderator in Community B
 * 5. Authenticate as Member B (no authority in Community A)
 * 6. Member B attempts to query snapshots for Community A's moderator
 *
 * Expected: Response status 403 Forbidden - member lacks moderator authority
 */
export async function test_api_moderator_snapshot_query_rejected_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and creates Community A (becomes owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  const communityA =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  // 2. Member B joins but is NOT a moderator of Community A
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 3. Member C joins and creates Community B (becomes owner of separate community)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuthorized = await authorize_member_join(memberCConnection, {});
  const communityB =
    await generate_random_reddit_clone_member_communities_create(
      memberCConnection,
      {},
    );
  // 4. Member C appoints a moderator in Community B (Member C becomes moderator)
  const moderatorB =
    await generate_random_reddit_clone_member_communities_moderators_create(
      memberCConnection,
      {
        body: {
          memberId: memberCAuthorized.id,
        },
        params: {
          communityId: communityB.id,
        },
      },
    );
  // 5. Authenticate as Member B - Member B has no authority in any community
  // 6. Member B attempts to query snapshots for Community A's moderator (owner)
  // Expected: 403 Forbidden - member lacks moderator authority in Community A
  await TestValidator.httpError(
    "non-moderator cannot query moderator snapshots",
    403,
    async () =>
      await api.functional.redditClone.member.communities.moderators.snapshots.index(
        memberBConnection,
        {
          communityId: communityA.id,
          moderatorId: memberAAuthorized.id,
          body: {},
        },
      ),
  );
}
