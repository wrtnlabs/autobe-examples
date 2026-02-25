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
import { RedditCloneContentCommentCollector } from "../collectors/RedditCloneContentCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneContentCommentTransformer } from "../transformers/RedditCloneContentCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommentsParentIdReplies(props: {
  member: MemberPayload;
  parentId: string & tags.Format<"uuid">;
  body: IRedditCloneContentComment.ICreate;
}): Promise<IRedditCloneContentComment> {
  // Validate parent comment exists and is not deleted
  const parentComment =
    await MyGlobal.prisma.reddit_clone_content_comments.findUniqueOrThrow({
      where: { id: props.parentId },
      select: {
        id: true,
        post_id: true,
        reply_count: true,
        member_id: true,
        post: { select: { community_id: true } },
      },
    });
  // Create the reply comment using collector
  const reply = await MyGlobal.prisma.reddit_clone_content_comments.create({
    data: await RedditCloneContentCommentCollector.collect({
      body: { ...props.body, postId: undefined, parentId: props.parentId },
      redditCloneMembers: props.member,
    }),
    ...RedditCloneContentCommentTransformer.select(),
  });
  // Increment parent comment's reply count atomically in the same transaction
  await MyGlobal.prisma.reddit_clone_content_comments.update({
    where: { id: props.parentId },
    data: { reply_count: { increment: 1 } },
  });
  return await RedditCloneContentCommentTransformer.transform(reply);
}
