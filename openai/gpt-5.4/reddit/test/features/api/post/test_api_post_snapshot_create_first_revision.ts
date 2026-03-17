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

export async function test_api_post_snapshot_create_first_revision(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    community_platform_community_id: community.id,
    post_type: "text",
    textContent: {
      body: RandomGenerator.content({ paragraphs: 2 }),
    },
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  const textContent = typia.assert<ICommunityPlatformPostText>(post.textContent);
  const baseline = {
    id: post.id,
    title: post.title,
    post_type: post.post_type,
    status: post.status,
    authorId: post.author.id,
    communityId: post.community.id,
    created_at: post.created_at,
    updated_at: post.updated_at,
    textBody: textContent.body,
  };
  const snapshot =
    await generate_random_community_platform_member_posts_snapshots_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          visibility_state: "active",
        },
      },
    );
  typia.assert(snapshot);
  TestValidator.notEquals("snapshot has its own id", snapshot.id, post.id);
  TestValidator.equals(
    "snapshot belongs to parent post",
    snapshot.post.id,
    baseline.id,
  );
  TestValidator.equals(
    "snapshot post title matches parent",
    snapshot.post.title,
    baseline.title,
  );
  TestValidator.equals(
    "snapshot post type matches parent",
    snapshot.post.post_type,
    baseline.post_type,
  );
  TestValidator.equals(
    "snapshot post status matches parent",
    snapshot.post.status,
    baseline.status,
  );
  TestValidator.equals(
    "snapshot post community matches parent",
    snapshot.post.community.id,
    baseline.communityId,
  );
  TestValidator.equals(
    "snapshot post author matches parent",
    snapshot.post.author.id,
    baseline.authorId,
  );
  TestValidator.equals(
    "first snapshot revision number",
    snapshot.revision_no,
    1,
  );
  TestValidator.equals(
    "snapshot preserves requested visibility state",
    snapshot.visibility_state,
    "active",
  );
  TestValidator.equals(
    "parent post title unchanged",
    post.title,
    baseline.title,
  );
  TestValidator.equals(
    "parent post type unchanged",
    post.post_type,
    baseline.post_type,
  );
  TestValidator.equals(
    "parent post status unchanged",
    post.status,
    baseline.status,
  );
  TestValidator.equals(
    "parent post author unchanged",
    post.author.id,
    baseline.authorId,
  );
  TestValidator.equals(
    "parent post community unchanged",
    post.community.id,
    baseline.communityId,
  );
  TestValidator.equals(
    "parent post created_at unchanged",
    post.created_at,
    baseline.created_at,
  );
  TestValidator.equals(
    "parent post updated_at unchanged",
    post.updated_at,
    baseline.updated_at,
  );
  TestValidator.equals(
    "parent post text body unchanged",
    textContent.body,
    baseline.textBody,
  );
}
