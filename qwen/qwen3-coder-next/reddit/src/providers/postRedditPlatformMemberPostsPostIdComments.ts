import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentTransformer } from "../transformers/RedditPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.ICreate;
}): Promise<IRedditPlatformComment> {
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  const created = await MyGlobal.prisma.reddit_platform_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      content: props.body.content,
      vote_score: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      author_id: props.member.id,
      post_id: props.postId,
      parent_comment_id: props.body.parent_comment_id ?? null,
    },
    ...RedditPlatformCommentTransformer.select(),
  });
  return await RedditPlatformCommentTransformer.transform(created);
}
