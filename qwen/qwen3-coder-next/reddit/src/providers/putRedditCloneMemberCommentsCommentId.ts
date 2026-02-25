import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneContentCommentTransformer } from "../transformers/RedditCloneContentCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneContentComment.IUpdate;
}): Promise<IRedditCloneContentComment> {
  const comment =
    await MyGlobal.prisma.reddit_clone_content_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { member_id: true },
    });
  if (comment.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.reddit_clone_content_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
    },
    ...RedditCloneContentCommentTransformer.select(),
  });
  return await RedditCloneContentCommentTransformer.transform(updated);
}
