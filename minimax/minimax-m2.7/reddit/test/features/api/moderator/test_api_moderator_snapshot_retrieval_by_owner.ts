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

export async function test_api_moderator_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the community owner via POST /redditClone/auth/member/join
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a new community - owner is automatically assigned 'owner' role with snapshot
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create another member and add them as a moderator
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // Owner assigns the member as a moderator - this creates a snapshot
  const moderator =
    typia.assert<IRedditCloneCommunityModerator & { id: string }>(
      await generate_random_reddit_clone_member_communities_moderators_create(
        ownerConnection,
        {
          body: {
            memberId: memberAuth.id,
            role: "moderator",
          } satisfies IRedditCloneCommunityModerator.ICreate,
          params: {
            communityId: community.id,
          },
        },
      ),
    );
  // 4. Retrieve the moderator snapshot via GET /redditClone/member/communities/{communityId}/moderators/{moderatorId}/snapshots/{snapshotId}
  const snapshot =
    await api.functional.redditClone.member.communities.moderators.snapshots.at(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
        snapshotId: moderator.id,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot response contains expected data
  TestValidator.equals(
    "snapshot id matches moderator id",
    snapshot.id,
    moderator.id,
  );
  TestValidator.equals(
    "community id matches",
    snapshot.redditCloneCommunityId,
    community.id,
  );
  TestValidator.equals("role is 'moderator'", snapshot.role, "moderator");
  TestValidator.equals(
    "member is the assigned moderator",
    snapshot.redditCloneMemberId,
    memberAuth.id,
  );
  TestValidator.equals(
    "assigned by owner",
    snapshot.assignedByUserId,
    ownerAuth.id,
  );
  TestValidator.predicate(
    "assignedAt timestamp exists",
    snapshot.assignedAt !== undefined && snapshot.assignedAt !== null,
  );
  TestValidator.predicate(
    "community reference exists",
    snapshot.community !== undefined && snapshot.community !== null,
  );
  TestValidator.predicate(
    "member reference exists",
    snapshot.member !== undefined && snapshot.member !== null,
  );
  TestValidator.predicate(
    "assigner reference exists",
    snapshot.assignedBy !== undefined && snapshot.assignedBy !== null,
  );
  TestValidator.predicate(
    "moderator reference exists",
    snapshot.moderator !== undefined && snapshot.moderator !== null,
  );
}