import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_report } from "../prepare/prepare_random_reddit_like_report";

export async function generate_random_reddit_like_member_posts_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeReport.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<IRedditLikeReport> {
  const prepared: IRedditLikeReport.ICreate = prepare_random_reddit_like_report(
    props.body,
  );
  return await api.functional.redditLike.member.posts.reports.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
