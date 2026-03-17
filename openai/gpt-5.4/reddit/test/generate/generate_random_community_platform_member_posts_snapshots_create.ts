import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_snapshot } from "../prepare/prepare_random_community_platform_post_snapshot";

export async function generate_random_community_platform_member_posts_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostSnapshot.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostSnapshot> {
  const prepared: ICommunityPlatformPostSnapshot.ICreate =
    prepare_random_community_platform_post_snapshot(props.body);
  const result: ICommunityPlatformPostSnapshot =
    await api.functional.communityPlatform.member.posts.snapshots.create(
      connection,
      {
        postId: props.params.postId,
        body: prepared,
      },
    );
  return result;
}
