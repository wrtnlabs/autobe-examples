import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_comment_report } from "../prepare/prepare_random_reddit_community_comment_report";

export async function generate_random_reddit_community_member_posts_comments_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityCommentReport.ICreate> | undefined;
    params: {
      postId: string;
      commentId: string;
    };
  },
): Promise<IRedditCommunityCommentReport> {
  const prepared: IRedditCommunityCommentReport.ICreate =
    prepare_random_reddit_community_comment_report(props.body);
  const result: IRedditCommunityCommentReport =
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      connection,
      {
        body: prepared,
        postId: props.params.postId,
        commentId: props.params.commentId,
      },
    );
  return result;
}
