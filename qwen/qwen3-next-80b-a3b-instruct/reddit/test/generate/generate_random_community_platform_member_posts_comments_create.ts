import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
  return await api.functional.communityPlatform.member.posts.comments.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
