import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommentAtSummaryTransformer } from "../transformers/RedditCommentAtSummaryTransformer";
import { RedditCommentTransformer } from "../transformers/RedditCommentTransformer";
import { RedditMemberAtSummaryTransformer } from "../transformers/RedditMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditComment.IUpdate;
}): Promise<IRedditComment> {
  const comment = await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    include: {
      post: {
        include: {
          author: RedditMemberAtSummaryTransformer.select(),
          comments: true,
          link: true,
          text: true,
          community: {
            include: {
              subscriptions: true,
              posts: true,
              owner: RedditMemberAtSummaryTransformer.select(),
              bans: true,
            },
          },
          images: true,
          votes: true,
        },
      },
    },
  });
  if (comment.post.author.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const createdAt = new Date(comment.created_at);
  const now = new Date();
  const twentyFourHoursInMilliseconds = 24 * 60 * 60 * 1000;
  if (now.getTime() - createdAt.getTime() > twentyFourHoursInMilliseconds) {
    throw new HttpException("Comment cannot be edited after 24 hours", 400);
  }
  await MyGlobal.prisma.reddit_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: toISOStringSafe(now),
    },
  });
  const updatedComment =
    await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      include: {
        post: {
          include: {
            author: RedditMemberAtSummaryTransformer.select(),
            comments: true,
            link: true,
            text: true,
            community: {
              include: {
                subscriptions: true,
                posts: true,
                owner: RedditMemberAtSummaryTransformer.select(),
                bans: true,
              },
            },
            images: true,
            votes: true,
          },
        },
        votes: true,
        parent: true,
        replies:
          RedditCommentAtSummaryTransformer.select() satisfies Prisma.reddit_commentsFindManyArgs,
        snapshots: true,
      },
    });
  return await RedditCommentTransformer.transform(updatedComment);
}
