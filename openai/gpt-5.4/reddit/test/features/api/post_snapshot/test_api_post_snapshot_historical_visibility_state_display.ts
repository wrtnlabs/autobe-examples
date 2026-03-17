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

export async function test_api_post_snapshot_historical_visibility_state_display(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
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
    title: RandomGenerator.paragraph({ sentences: 3 }),
    community_platform_community_id: community.id,
    post_type: "text",
    textContent: {
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies ICommunityPlatformPostText.ICreate,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  const historicalVisibilityState = "deleted" as const;
  const snapshot =
    await generate_random_community_platform_member_posts_snapshots_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          visibility_state: historicalVisibilityState,
        },
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "created snapshot records requested historical visibility state",
    snapshot.visibility_state,
    historicalVisibilityState,
  );
  const publicConnection: api.IConnection = { host: connection.host };
  const history = await api.functional.communityPlatform.posts.snapshots.at(
    publicConnection,
    {
      postId: post.id,
      snapshotId: snapshot.id,
    },
  );
  typia.assert(history);
  TestValidator.equals("snapshot id preserved", history.id, snapshot.id);
  TestValidator.equals("parent post id preserved", history.post.id, post.id);
  TestValidator.equals(
    "snapshot revision preserved",
    history.revision_no,
    snapshot.revision_no,
  );
  TestValidator.equals(
    "snapshot created_at preserved",
    history.created_at,
    snapshot.created_at,
  );
  TestValidator.equals(
    "historical visibility_state preserved",
    history.visibility_state,
    historicalVisibilityState,
  );
  TestValidator.equals(
    "retrieved visibility matches created snapshot",
    history.visibility_state,
    snapshot.visibility_state,
  );
}
