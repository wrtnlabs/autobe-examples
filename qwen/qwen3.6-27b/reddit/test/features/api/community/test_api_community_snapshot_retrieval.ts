import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Test retrieval of a community configuration snapshot after community update.
 *
 * Validates that the GET endpoint returns a complete IRedditLikeCommunityCommunitySnapshot containing all expected fields with proper types. The snapshot captures the community name, description, icon URI, and owner identity at the point in time when the snapshot was created.
 *
 * Special attention is given to verifying nested relational objects: the community summary must correctly reference the parent community with accurate identity, and the owner summary must match the community creator for integrity verification.
 *
 * 1. Member registers with random email and authenticates via join endpoint.
 * 2. Member creates a community with specific name and description.
 * 3. Community configuration is updated to trigger automatic snapshot creation.
 * 4. Snapshot is retrieved by ID and validated via typia.assert().
 * 5. Validates community reference ID matches created community, owner ID matches creator, and snapshot name is present.
 */
export async function test_api_community_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: { email: memberEmail },
  });
  // 2. Create community with specific name and description
  const communityName = RandomGenerator.name();
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: { name: communityName, description: communityDescription },
      },
    );
  typia.assert(community);
  // 3. Update community configuration to trigger snapshot creation
  const updatedName = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  await api.functional.redditLikeCommunity.member.communities.update(
    memberConnection,
    {
      communityId: community.id,
      body: {
        name: updatedName,
        description: updatedDescription,
      } satisfies IREdditLikeCommunityCommunity.IUpdate,
    },
  );
  // 4. Retrieve snapshot and validate complete structure
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.redditLikeCommunity.community_snapshots.at(
      memberConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot relationships and business logic
  TestValidator.equals(
    "community reference ID matches created community",
    snapshot.community.id,
    community.id,
  );
  TestValidator.equals(
    "owner ID matches community creator ID",
    snapshot.owner.id,
    community.creator.id,
  );
  TestValidator.predicate(
    "snapshot name is non-empty",
    snapshot.name.length > 0,
  );
}
