import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserPostsPostIdVotes(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  if (
    props.body.vote_type !== "upvote" &&
    props.body.vote_type !== "downvote" &&
    props.body.vote_type !== "remove"
  ) {
    throw new HttpException("Invalid vote_type", 400);
  }
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, author_user_id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const existingVote = await prisma.community_platform_post_votes.findFirst({
      where: {
        post_id: props.postId,
        user_id: props.user.id,
        deleted_at: null,
      },
    });
    if (props.body.vote_type === "remove") {
      if (existingVote) {
        await prisma.community_platform_post_votes.delete({
          where: { id: existingVote.id },
        });
      }
    } else {
      if (existingVote) {
        await prisma.community_platform_post_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_type: props.body.vote_type,
            updated_at: new Date().toISOString() as string &
              tags.Format<"date-time">,
          },
        });
      } else {
        await prisma.community_platform_post_votes.create({
          data: {
            id: v4(),
            post_id: props.postId,
            user_id: props.user.id,
            vote_type: props.body.vote_type,
            created_at: new Date().toISOString() as string &
              tags.Format<"date-time">,
            updated_at: new Date().toISOString() as string &
              tags.Format<"date-time">,
            deleted_at: null,
          },
        });
      }
    }
    const upvotesCount = await prisma.community_platform_post_votes.count({
      where: { post_id: props.postId, vote_type: "upvote", deleted_at: null },
    });
    const downvotesCount = await prisma.community_platform_post_votes.count({
      where: { post_id: props.postId, vote_type: "downvote", deleted_at: null },
    });
    if (!post.author_user_id) {
      throw new HttpException("Post author not found", 404);
    }
    await prisma.community_platform_users.update({
      where: { id: post.author_user_id },
      data: { karma: upvotesCount - downvotesCount },
    });
    return {
      upvotes: upvotesCount,
      downvotes: downvotesCount,
    } satisfies ICommunityPlatformPostVote;
  });
}
