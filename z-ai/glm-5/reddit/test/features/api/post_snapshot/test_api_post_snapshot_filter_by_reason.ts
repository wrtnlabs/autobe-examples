import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_post_snapshot_filter_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Create post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 4. Edit the post to generate an 'edit' snapshot
  const updatedPost = await api.functional.community.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: `Updated: ${post.title}`,
      } satisfies ICommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 5. Query post-snapshots filtered by snapshot_reason='edit'
  const editSnapshots = await api.functional.community.post_snapshots.index(
    connection,
    {
      body: {
        snapshot_reason: "edit",
        community_id: community.id,
      } satisfies ICommunityPostSnapshot.IRequest,
    },
  );
  typia.assert(editSnapshots);
  // 6. Validate all returned snapshots have snapshot_reason='edit'
  TestValidator.predicate(
    "all edit snapshots have correct reason",
    editSnapshots.data.every((s) => s.snapshot_reason === "edit"),
  );
  // 7. Validate the edited post's snapshot appears in results
  TestValidator.predicate(
    "edited post snapshot exists in results",
    editSnapshots.data.some((s) => s.community_post_id === post.id),
  );
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination records match data length",
    editSnapshots.pagination.records >= editSnapshots.data.length,
  );
  // 9. Test filtering by 'deletion' reason (should return empty)
  const deletionSnapshots = await api.functional.community.post_snapshots.index(
    connection,
    {
      body: {
        snapshot_reason: "deletion",
        community_id: community.id,
      } satisfies ICommunityPostSnapshot.IRequest,
    },
  );
  typia.assert(deletionSnapshots);
  TestValidator.predicate(
    "no deletion snapshots exist",
    deletionSnapshots.data.length === 0,
  );
  // 10. Test filtering by 'moderation' reason (should return empty)
  const moderationSnapshots =
    await api.functional.community.post_snapshots.index(connection, {
      body: {
        snapshot_reason: "moderation",
        community_id: community.id,
      } satisfies ICommunityPostSnapshot.IRequest,
    });
  typia.assert(moderationSnapshots);
  TestValidator.predicate(
    "no moderation snapshots exist",
    moderationSnapshots.data.length === 0,
  );
}
