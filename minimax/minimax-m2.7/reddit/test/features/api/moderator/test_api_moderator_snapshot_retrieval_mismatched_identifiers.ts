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

export async function test_api_moderator_snapshot_retrieval_mismatched_identifiers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A and create Community A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuthorized);
  const communityA =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(communityA);
  // 2. Register member B and create Community B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuthorized);
  const communityB =
    await generate_random_reddit_clone_member_communities_create(
      memberBConnection,
      {},
    );
  typia.assert(communityB);
  // 3. Create a moderator in Community B (member A becomes moderator)
  await generate_random_reddit_clone_member_communities_moderators_create(
    memberBConnection,
    {
      params: { communityId: communityB.id },
      body: {
        memberId: memberAAuthorized.id,
      },
    },
  );
  // 4. Test 1: Attempt to retrieve snapshot using Community A's communityId
  // with a random moderatorId that doesn't exist in the system
  // This should return 404 because no snapshot exists for this combination
  const randomModeratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent moderator returns 404",
    404,
    async () => {
      await api.functional.redditClone.member.communities.moderators.snapshots.at(
        memberAConnection,
        {
          communityId: communityA.id,
          moderatorId: randomModeratorId,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 5. Test 2: Create a moderator in Community A
  await generate_random_reddit_clone_member_communities_moderators_create(
    memberAConnection,
    {
      params: { communityId: communityA.id },
      body: {
        memberId: memberBAuthorized.id,
      },
    },
  );
  // Test 2: Use a non-existent snapshotId with valid communityId and moderatorId
  // The moderatorId is the member ID of memberB (who is a moderator in communityA)
  // but no snapshot exists for this specific moderator, so it should return 404
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () => {
      await api.functional.redditClone.member.communities.moderators.snapshots.at(
        memberAConnection,
        {
          communityId: communityA.id,
          moderatorId: memberBAuthorized.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 6. Test 3: Verify mismatched community and moderator combination returns 404
  // Use Community A's communityId with the random moderatorId (not associated with Community A)
  await TestValidator.httpError(
    "mismatched community and moderator returns 404",
    404,
    async () => {
      await api.functional.redditClone.member.communities.moderators.snapshots.at(
        memberAConnection,
        {
          communityId: communityA.id,
          moderatorId: randomModeratorId,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
