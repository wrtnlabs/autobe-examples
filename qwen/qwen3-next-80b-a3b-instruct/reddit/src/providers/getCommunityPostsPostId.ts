import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getCommunityPostsPostId(props: {
  postId: string;
}): Promise<ICommunityPost> {
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      title: true,
      content_type: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      community_member_id: true,
      community_id: true,
      community_post_status_id: true,
      postLink: {
        select: {
          url: true,
          domain_name: true,
        },
      },
      text: {
        select: {
          content: true,
        },
      },
      postImages: {
        select: {
          file_reference: true,
          thumbnail_reference: true,
          original_width: true,
          original_height: true,
          compressed_size: true,
        },
      },
      commentCount: {
        select: {
          comment_count: true,
        },
      },
      votes: {
        select: {
          vote_type: true,
        },
      },
      // Join with author (member)
      author: {
        select: {
          id: true,
          display_name: true,
          is_email_verified: true,
          created_at: true,
        },
      },
      // Join with community
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          created_at: true,
        },
      },
      // Join with status
      status: {
        select: {
          status: true,
        },
      },
    },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Calculate vote score by aggregating vote_type values
  const voteScore = post.votes.reduce(
    (
      acc: number,
      vote: {
        vote_type: string;
      },
    ) => {
      return vote.vote_type === "upvote"
        ? acc + 1
        : vote.vote_type === "downvote"
          ? acc - 1
          : acc;
    },
    0,
  );
  // Transform data with proper types
  const result: ICommunityPost = {
    id: post.id as string & tags.Format<"uuid">,
    title: post.title,
    content_type: post.content_type,
    created_at: toISOStringSafe(post.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(post.updated_at) as string &
      tags.Format<"date-time">,
    author: {
      id: post.author.id as string & tags.Format<"uuid">,
      display_name: post.author.display_name,
      is_email_verified: post.author.is_email_verified,
      created_at: toISOStringSafe(post.author.created_at) as string &
        tags.Format<"date-time">,
    },
    community: {
      id: post.community.id as string & tags.Format<"uuid">,
      name: post.community.name,
      description: post.community.description,
      icon_url: post.community.icon_url,
      created_at: toISOStringSafe(post.community.created_at) as string &
        tags.Format<"date-time">,
    },
    status: post.status.status,
    comment_count: post.commentCount?.comment_count ?? 0,
    vote_score: voteScore,
    content:
      post.content_type === "text"
        ? { text: post.text?.content ?? "" }
        : post.content_type === "link"
          ? {
              url: post.postLink?.url ?? "",
              domain_name: post.postLink?.domain_name ?? "",
            }
          : post.content_type === "image"
            ? {
                url: post.postImages?.file_reference ?? "",
                thumbnail: post.postImages?.thumbnail_reference ?? "",
                original_width: post.postImages?.original_width,
                original_height: post.postImages?.original_height,
                compressed_size: post.postImages?.compressed_size,
              }
            : {},
  };
  return result;
}
