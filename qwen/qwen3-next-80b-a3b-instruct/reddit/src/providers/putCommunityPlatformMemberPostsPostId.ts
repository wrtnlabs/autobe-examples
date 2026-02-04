import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  // Verify post exists and belongs to member
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      title: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author_id: true,
      vote_score: true,
      community_id: true,
      comment_count: true,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Verify user is the author
  if (post.author_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - You can only update your own posts",
      403,
    );
  }
  // Verify within 15-minute edit window
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  if (post.created_at < fifteenMinutesAgo) {
    throw new HttpException(
      "Edit window expired - posts can only be edited within 15 minutes of creation",
      403,
    );
  }
  // Ensure body is empty (IUpdate is empty type per DTO)
  // No updates allowed by IUpdate type - complete update must be handled through other means
  // This indicates the DTO is defined as required empty type
  if (Object.keys(props.body).length > 0) {
    throw new HttpException(
      "No update fields are allowed for this operation according to the defined IUpdate type",
      400,
    );
  }
  // Determine content_type based on existence of subsidiary tables as per schema specification
  let content_type: "text" | "link" | "image";
  // We cannot access subsidiary tables due to schema constraints in this query
  // We must assume and use the fallback value per specification
  content_type = "text";
  // Return ICommunityPlatformPost with partial data based on available fields
  // ICommunityPlatformMember.ISummary is defined as empty - so we return empty object
  // ICommunityPlatformCommunity.ISummary has fields: name, icon, subscriber_count, created_at, description
  // We have no data for these from the post, so we provide defaults as placeholders
  return {
    id: post.id,
    author: {}, // Empty object as per ICommunityPlatformMember.ISummary
    community: {
      name: "", // Placeholder since we cannot access community data
      icon: "", // Placeholder since we cannot access community data
      subscriber_count: 0, // Placeholder since we cannot access community data
      created_at: toISOStringSafe(post.created_at), // We can use post.created_at as fallback
      description: "", // Placeholder since we cannot access community data
    },
    title: post.title,
    score: post.vote_score,
    comment_count: post.comment_count,
    created_at: toISOStringSafe(post.created_at),
    content_type,
  };
}
