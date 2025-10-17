import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function patchRedditCommunityCommunityModeratorPostsPostIdComments(props: {
  communityModerator: CommunitymoderatorPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const { communityModerator, postId, body } = props;

  // Verify the post exists and get its community ID
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: postId },
    select: { id: true, reddit_community_community_id: true },
  });

  // Check if the communityModerator is assigned to the post's community
  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: communityModerator.id,
        community_id: post.reddit_community_community_id,
      },
    });

  if (!moderator) {
    throw new HttpException(
      "Forbidden: You are not a moderator of this community",
      403,
    );
  }

  // Handle pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Construct where filter with optional fields
  const where = {
    reddit_community_post_id: postId,
    deleted_at: null,
    ...(body.author_member_id !== undefined &&
      body.author_member_id !== null && {
        author_member_id: body.author_member_id,
      }),
    ...(body.author_guest_id !== undefined &&
      body.author_guest_id !== null && {
        author_guest_id: body.author_guest_id,
      }),
    ...(body.parent_comment_id !== undefined &&
      body.parent_comment_id !== null && {
        parent_comment_id: body.parent_comment_id,
      }),
    ...(body.body_text !== undefined &&
      body.body_text !== null && {
        body_text: { contains: body.body_text },
      }),
  };

  // Query total count and paginated comments
  const [total, comments] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.count({ where }),
    MyGlobal.prisma.reddit_community_comments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        body_text: true,
        author_member_id: true,
        author_guest_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);

  // Format results as per IPageIRedditCommunityComment.ISummary
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: comments.map((comment) => ({
      id: comment.id,
      body_text: comment.body_text,
      author_member_id:
        comment.author_member_id === null
          ? undefined
          : comment.author_member_id,
      author_guest_id:
        comment.author_guest_id === null ? undefined : comment.author_guest_id,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
    })),
  };
}
