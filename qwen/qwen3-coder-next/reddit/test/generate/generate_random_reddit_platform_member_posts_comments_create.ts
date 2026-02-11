import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_comment } from "../prepare/prepare_random_reddit_platform_comment";

export async function generate_random_reddit_platform_member_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformComment.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<IRedditPlatformComment> {
  const prepared: IRedditPlatformComment.ICreate =
    prepare_random_reddit_platform_comment(props.body);
  return await api.functional.redditPlatform.member.posts.comments.create(
    connection,
    {
      postId: props.params.postId,
      body: prepared,
    },
  );
}
