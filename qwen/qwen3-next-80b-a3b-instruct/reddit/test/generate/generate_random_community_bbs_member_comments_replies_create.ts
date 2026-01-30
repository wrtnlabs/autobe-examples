import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReply";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import { prepare_random_community_bbs_comment_reply } from "../prepare/prepare_random_community_bbs_comment_reply";
export async function generate_random_community_bbs_member_comments_replies_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsCommentReply.ICreate> | undefined;
    params: {
      commentId: string;
    };
  },
): Promise<ICommunityBbsCommentReply> {
  const prepared: ICommunityBbsCommentReply.ICreate =
    prepare_random_community_bbs_comment_reply(props.body);
  return await api.functional.communityBbs.member.comments.replies.create(
    connection,
    {
      body: prepared,
      commentId: props.params.commentId,
    },
  );
}
