import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_snapshots_create } from "../../../generate/generate_random_community_platform_member_posts_snapshots_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_post_snapshot_parent_scope_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const firstPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "text",
          textContent: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(firstPost);
  const secondPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "text",
          textContent: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(secondPost);
  TestValidator.notEquals(
    "posts must be distinct",
    firstPost.id,
    secondPost.id,
  );
  const snapshot =
    await generate_random_community_platform_member_posts_snapshots_create(
      memberConnection,
      {
        params: {
          postId: firstPost.id,
        },
        body: {
          visibility_state: "active",
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot belongs to first post",
    snapshot.post.id,
    firstPost.id,
  );
  const readConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "snapshot detail must not leak across sibling post scope",
    404,
    async () => {
      await api.functional.communityPlatform.posts.snapshots.at(
        readConnection,
        {
          postId: secondPost.id,
          snapshotId: snapshot.id,
        },
      );
    },
  );
}
