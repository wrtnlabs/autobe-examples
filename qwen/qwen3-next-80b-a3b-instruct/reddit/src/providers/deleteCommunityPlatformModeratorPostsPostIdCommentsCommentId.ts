import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload"

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteCommunityPlatformModeratorPostsPostIdCommentsCommentId(props: {
    moderator: ModeratorPayload;
    postId: string & tags.Format<"uuid">;
    commentId: string & tags.Format<"uuid">;
}): Promise<void> {
    // Verify comment exists and belongs to the specified post
    const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
        where: {
            id: props.commentId,
        },
        select: {
            id: true,
            post_id: true,
            deleted_at: true,
            author_id: true,
        },
    });
    if (!comment) {
        throw new HttpException("Comment not found", 404);
    }
    // Verify comment is not already deleted
    if (comment.deleted_at !== null) {
        throw new HttpException("Comment already deleted", 410); // Gone
    }
    // Verify moderator is authorized: moderator must either own comment or have community-level authority
    // Get the community the post belongs to
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
        where: { id: props.postId },
        select: { community_id: true, author_id: true },
    });
    if (!post) {
        throw new HttpException("Post not found", 404);
    }
    // Check if moderator is the author of the comment
    if (comment.author_id === props.moderator.id) {
        // Moderator is author - allow deletion
    }
    else {
        // Moderator is not author - check if they are moderator of the community
        const moderatorInCommunity = await MyGlobal.prisma.community_platform_moderators.findFirst({
            where: {
                member_id: props.moderator.id,
                deleted_at: null,
                community_id: post.community_id,
                community_platform_member_sessions: {
                    some: {
                        id: props.moderator.session_id,
                        expired_at: { gt: new Date() },
                    },
                },
            },
        });
        if (!moderatorInCommunity) {
            throw new HttpException("Insufficient permissions to delete this comment", 403);
        }
    }
    // Perform soft delete
    await MyGlobal.prisma.community_platform_comments.update({
        where: { id: props.commentId },
        data: {
            deleted_at: toISOStringSafe(new Date()),
        },
    });
    // Decrement the comment count on the parent post
    await MyGlobal.prisma.community_platform_posts.update({
        where: { id: props.postId },
        data: {
            comment_count: { decrement: 1 },
        },
    });
    // Log the moderation action
    await MyGlobal.prisma.community_platform_moderation_logs.create({
        data: {
            id: v4(),
            user_id: props.moderator.id,
            action: "delete_comment",
            target_id: props.commentId,
            details: `Comment on post ${props.postId} deleted by moderator",
      created_at: toISOStringSafe(new Date()),
    },
  });
}
        }
    });
}
