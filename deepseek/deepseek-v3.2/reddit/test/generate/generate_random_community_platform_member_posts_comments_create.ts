import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment } from "../prepare/prepare_random_community_platform_comment";

export async function generate_random_community_platform_member_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformComment.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformComment> {
  const prepared: ICommunityPlatformComment.ICreate =
    prepare_random_community_platform_comment(props.body);
  const result: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: props.params.postId,
        body: prepared,
      },
    );
  return result;
}
