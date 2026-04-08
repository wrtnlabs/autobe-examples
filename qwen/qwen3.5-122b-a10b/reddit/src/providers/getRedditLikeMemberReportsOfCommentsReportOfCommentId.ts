import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeReportOfCommentTransformer } from "../transformers/RedditLikeReportOfCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberReportsOfCommentsReportOfCommentId(props: {
  member: MemberPayload;
  reportOfCommentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeReportOfComment> {
  // Retrieve the report-of-comment linkage record
  const record =
    await MyGlobal.prisma.reddit_like_report_of_comments.findFirstOrThrow({
      where: {
        id: props.reportOfCommentId,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_like_comment_id: true,
      },
    });
  // Get the comment's post to find the community
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: {
      id: record.reddit_like_comment_id,
      deleted_at: null,
    },
    select: {
      reddit_like_post_id: true,
    },
  });
  // Get the post to find the community
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: {
      id: comment.reddit_like_post_id,
      deleted_at: null,
    },
    select: {
      reddit_like_community_id: true,
    },
  });
  // Check if member is a moderator for this community
  const isModerator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_id: post.reddit_like_community_id,
        reddit_like_member_id: props.member.id,
      },
    });
  // Check if member is the community owner
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: {
      id: post.reddit_like_community_id,
    },
    select: {
      owner_id: true,
    },
  });
  const isOwner = community?.owner_id === props.member.id;
  // Verify authorization
  if (!isModerator && !isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the full record with nested relations
  const fullRecord =
    await MyGlobal.prisma.reddit_like_report_of_comments.findUniqueOrThrow({
      where: {
        id: props.reportOfCommentId,
        deleted_at: null,
      },
      ...RedditLikeReportOfCommentTransformer.select(),
    });
  return await RedditLikeReportOfCommentTransformer.transform(fullRecord);
}
