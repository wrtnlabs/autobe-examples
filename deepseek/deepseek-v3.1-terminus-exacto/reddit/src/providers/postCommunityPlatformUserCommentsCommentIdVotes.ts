import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentVoteCollector } from "../collectors/CommunityPlatformCommentVoteCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "../transformers/CommunityPlatformUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformUserCommentsCommentIdVotes(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  // Validate that the comment exists and is accessible
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: { id: true },
  });
  // Handle vote removal (none) by deleting the vote record
  if (props.body.vote_type === "none") {
    const existingVote =
      await MyGlobal.prisma.community_platform_comment_votes.findUnique({
        where: {
          user_id_comment_id: {
            user_id: props.user.id,
            comment_id: props.commentId,
          },
        },
        ...CommunityPlatformCommentVoteTransformer.select(),
      });
    if (existingVote) {
      await MyGlobal.prisma.community_platform_comment_votes.delete({
        where: {
          user_id_comment_id: {
            user_id: props.user.id,
            comment_id: props.commentId,
          },
        },
      });
      return await CommunityPlatformCommentVoteTransformer.transform(
        existingVote,
      );
    }
    // If no vote existed, return empty structure
    const emptyUser = await MyGlobal.prisma.community_platform_users.findFirst({
      where: { id: props.user.id },
      ...CommunityPlatformUserAtSummaryTransformer.select(),
    });
    const emptyComment =
      await MyGlobal.prisma.community_platform_comments.findFirst({
        where: { id: props.commentId },
        ...CommunityPlatformCommentAtSummaryTransformer.select(),
      });
    return {
      id: v4(),
      vote_type: "none",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      user: emptyUser
        ? await CommunityPlatformUserAtSummaryTransformer.transform(emptyUser)
        : {
            id: props.user.id,
            username: "",
            display_name: null,
            avatar_url: null,
            karma: 0,
            created_at: toISOStringSafe(new Date()),
          },
      comment: emptyComment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            emptyComment,
          )
        : {
            id: props.commentId,
            content: "",
            vote_score: 0,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            author: {
              id: props.user.id,
              username: "",
              display_name: null,
              avatar_url: null,
              karma: 0,
              created_at: toISOStringSafe(new Date()),
            },
            post: {
              id: v4(),
              title: "",
              post_type: "",
              created_at: toISOStringSafe(new Date()),
              author: {
                id: props.user.id,
                username: "",
                display_name: null,
                avatar_url: null,
                karma: 0,
                created_at: toISOStringSafe(new Date()),
              },
              community: {
                id: v4(),
                name: "",
                description: "",
                icon_url: null,
                created_at: toISOStringSafe(new Date()),
                owner: {
                  id: props.user.id,
                  username: "",
                  display_name: null,
                  avatar_url: null,
                  karma: 0,
                  created_at: toISOStringSafe(new Date()),
                },
              },
            },
          },
    };
  }
  // Use upsert for upvote/downvote operations
  const vote = await MyGlobal.prisma.community_platform_comment_votes.upsert({
    where: {
      user_id_comment_id: {
        user_id: props.user.id,
        comment_id: props.commentId,
      },
    },
    create: await CommunityPlatformCommentVoteCollector.collect({
      body: props.body,
      user: { id: props.user.id },
      comment: { id: props.commentId },
      session: { id: props.user.session_id },
    }),
    update: {
      vote_type: props.body.vote_type,
      updated_at: new Date(),
    },
    ...CommunityPlatformCommentVoteTransformer.select(),
  });
  return await CommunityPlatformCommentVoteTransformer.transform(vote);
}
