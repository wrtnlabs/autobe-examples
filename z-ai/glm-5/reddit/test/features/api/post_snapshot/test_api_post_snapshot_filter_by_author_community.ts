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

export async function test_api_post_snapshot_filter_by_author_community(
  connection: api.IConnection,
): Promise<void> {
  // Create first member and community
  const author1Connection: api.IConnection = { host: connection.host };
  const author1 = await authorize_member_join(author1Connection, {});
  typia.assert(author1);
  const community1 = await generate_random_community_member_communities_create(
    author1Connection,
    {},
  );
  typia.assert(community1);
  // Create and delete post in first community (generates snapshot)
  const post1 = await generate_random_community_member_communities_posts_create(
    author1Connection,
    {
      params: { communityName: community1.name },
    },
  );
  typia.assert(post1);
  await api.functional.community.member.posts.erase(author1Connection, {
    postId: post1.id,
  });
  // Create second member and community
  const author2Connection: api.IConnection = { host: connection.host };
  const author2 = await authorize_member_join(author2Connection, {});
  typia.assert(author2);
  const community2 = await generate_random_community_member_communities_create(
    author2Connection,
    {},
  );
  typia.assert(community2);
  // Create and delete post in second community (generates snapshot)
  const post2 = await generate_random_community_member_communities_posts_create(
    author2Connection,
    {
      params: { communityName: community2.name },
    },
  );
  typia.assert(post2);
  await api.functional.community.member.posts.erase(author2Connection, {
    postId: post2.id,
  });
  // Test 1: Filter by author_id (first author)
  const snapshotsByAuthor1 =
    await api.functional.community.post_snapshots.index(connection, {
      body: {
        author_id: author1.id,
      } satisfies ICommunityPostSnapshot.IRequest,
    });
  typia.assert(snapshotsByAuthor1);
  // Validate all snapshots belong to author1
  TestValidator.predicate(
    "all snapshots belong to author1",
    snapshotsByAuthor1.data.every(
      (snapshot) => snapshot.author.id === author1.id,
    ),
  );
  TestValidator.predicate(
    "author1 has at least one snapshot",
    snapshotsByAuthor1.data.length >= 1,
  );
  // Test 2: Filter by community_id (first community)
  const snapshotsByCommunity1 =
    await api.functional.community.post_snapshots.index(connection, {
      body: {
        community_id: community1.id,
      } satisfies ICommunityPostSnapshot.IRequest,
    });
  typia.assert(snapshotsByCommunity1);
  // Validate all snapshots belong to community1
  TestValidator.predicate(
    "all snapshots belong to community1",
    snapshotsByCommunity1.data.every(
      (snapshot) => snapshot.community.id === community1.id,
    ),
  );
  TestValidator.predicate(
    "community1 has at least one snapshot",
    snapshotsByCommunity1.data.length >= 1,
  );
  // Test 3: Combined filter (author_id + community_id)
  const snapshotsCombined = await api.functional.community.post_snapshots.index(
    connection,
    {
      body: {
        author_id: author1.id,
        community_id: community1.id,
      } satisfies ICommunityPostSnapshot.IRequest,
    },
  );
  typia.assert(snapshotsCombined);
  // Validate all snapshots match both criteria
  TestValidator.predicate(
    "all snapshots match both author1 and community1",
    snapshotsCombined.data.every(
      (snapshot) =>
        snapshot.author.id === author1.id &&
        snapshot.community.id === community1.id,
    ),
  );
  // Test 4: Filter by author2 should not return author1's snapshots
  const snapshotsByAuthor2 =
    await api.functional.community.post_snapshots.index(connection, {
      body: {
        author_id: author2.id,
      } satisfies ICommunityPostSnapshot.IRequest,
    });
  typia.assert(snapshotsByAuthor2);
  TestValidator.predicate(
    "author2 snapshots are different from author1",
    snapshotsByAuthor2.data.every(
      (snapshot) => snapshot.author.id === author2.id,
    ),
  );
  TestValidator.predicate(
    "author2 snapshots belong to community2",
    snapshotsByAuthor2.data.every(
      (snapshot) => snapshot.community.id === community2.id,
    ),
  );
}
