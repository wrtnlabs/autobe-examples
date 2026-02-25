import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicBoardCommentTransformer } from "../transformers/EconomicBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicBoardCitizenArticlesArticleIdCommentsCommentId(props: {
  citizen: CitizenPayload;
  articleId: string;
  commentId: string;
  body: IEconomicBoardComment.IUpdate;
}): Promise<IEconomicBoardComment> {
  const comment =
    await MyGlobal.prisma.economic_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article_id: true,
        author_id: true,
        article: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            section_id: true,
            author_id: true,
            title: true,
            content: true,
            is_deleted: true,
            section: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
              },
            },
            author: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                email: true,
                display_name: true,
                bio: true,
                is_banned: true,
                ban_reason: true,
              },
            },
            articleTags: {
              select: {
                tag: true,
              },
            },
            attachments: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                file_url: true,
                file_name: true,
                file_type: true,
                file_size: true,
                article_id: true,
              },
            },
            views: {
              select: {
                id: true,
                created_at: true,
                article_id: true,
                user_id: true,
                user_type: true,
              },
            },
          },
        },
        author: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            email: true,
            password_hash: true,
            display_name: true,
            bio: true,
            is_banned: true,
            ban_reason: true,
            citizenSessions: {
              select: {
                id: true,
                created_at: true,
                citizen_id: true,
                access_token: true,
                refresh_token: true,
                device_fingerprint: true,
                ip: true,
                href: true,
                referrer: true,
                expired_at: true,
              },
            },
            passwordResets: {
              select: {
                id: true,
                user_id: true,
                token: true,
                expires_at: true,
              },
            },
            emailVerifications: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                citizen_id: true,
                token: true,
                expires_at: true,
                is_used: true,
              },
            },
            auditTargets: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                actor_id: true,
                target_id: true,
                action_type: true,
                reason: true,
                ip_address: true,
              },
            },
            articleViews: {
              select: {
                id: true,
                created_at: true,
                article_id: true,
                user_id: true,
                user_type: true,
              },
            },
            comments: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                author_id: true,
                content: true,
                article_id: true,
              },
            },
            articles: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                section_id: true,
                author_id: true,
                title: true,
                content: true,
                is_deleted: true,
              },
            },
          },
        },
      },
    });
  // Verify comment belongs to the correct article
  if (comment.article_id !== props.articleId) {
    throw new HttpException("Comment does not belong to this article", 404);
  }
  // Verify user is either the author or an administrator
  if (comment.author_id !== props.citizen.id) {
    // Since operator has citizen role, we must check if actor is an admin
    // Per analysis files: administrators can edit any comment
    // System does not provide explicit admin field in CitizenPayload — we assume auth layer assigns correct type
    // But CitizenPayload.type is 'citizen' — this is inconsistent with actor-based permission model
    // However, according to actor definition in 03-functional-requirements.md, only Citizen, Administrator, SuperAdministrator exist
    // And CitizenPayload is the payload for citizen type auth — so this endpoint should not be called by admin actor
    // Therefore: check must be against Actor system - but no actor checking layer available here
    // We assume middleware has ensured only authorized users reach this endpoint
    // And based on 'authorizationActor': 'citizen' in operation spec — this endpoint is intended for citizens only
    // And edit permission is extended to the comment author (citizen) only - not other admins
    // So we only allow edit if author_id === citizen.id
    // This contradicts the spec which says 'administrator can edit any comment' — but the endpoint is explicitly for 'citizen'
    // Therefore, we must restrict to author only
    throw new HttpException("You can only edit your own comments", 403);
  }
  // Verify comment is not soft-deleted
  if (comment.deleted_at !== null) {
    throw new HttpException(
      "Comment has been deleted and cannot be edited",
      403,
    );
  }
  // Verify edit window (60 minutes)
  // Convert string ISO date-time to Date object for comparison
  const createdAt = new Date(comment.created_at);
  const updatedAt = new Date(comment.updated_at);
  const now = new Date();
  const editWindow = 60 * 60 * 1000; // 60 minutes in milliseconds
  const elapsed = now.getTime() - updatedAt.getTime();
  if (elapsed > editWindow) {
    throw new HttpException("Edit window expired (60 minutes)", 403);
  }
  // Validate content length after trimming
  const trimmedContent = props.body.content.trim();
  if (trimmedContent.length === 0) {
    throw new HttpException("Comment content cannot be empty", 400);
  }
  if (trimmedContent.length > 1000) {
    throw new HttpException(
      "Comment content cannot exceed 1000 characters",
      400,
    );
  }
  // Update comment content and updated_at
  await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: {
      content: trimmedContent,
      updated_at: new Date(),
    },
  });
  // Re-fetch the full comment with all relations after update
  const updatedComment =
    await MyGlobal.prisma.economic_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article_id: true,
        author_id: true,
        article: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            section_id: true,
            author_id: true,
            title: true,
            content: true,
            is_deleted: true,
            section: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
              },
            },
            author: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                email: true,
                display_name: true,
                bio: true,
                is_banned: true,
                ban_reason: true,
              },
            },
            articleTags: {
              select: {
                tag: true,
              },
            },
            attachments: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                file_url: true,
                file_name: true,
                file_type: true,
                file_size: true,
                article_id: true,
              },
            },
            views: {
              select: {
                id: true,
                created_at: true,
                article_id: true,
                user_id: true,
                user_type: true,
              },
            },
            // Add missing required fields for IEconomicBoardComment
            comments: {
              select: {
                id: true,
              },
            },
            snapshots: {
              select: {
                id: true,
                created_at: true,
                article_id: true,
                snapshot_reason: true,
              },
            },
          },
        },
        author: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            email: true,
            password_hash: true,
            display_name: true,
            bio: true,
            is_banned: true,
            ban_reason: true,
            citizenSessions: {
              select: {
                id: true,
                created_at: true,
                citizen_id: true,
                access_token: true,
                refresh_token: true,
                device_fingerprint: true,
                ip: true,
                href: true,
                referrer: true,
                expired_at: true,
              },
            },
            passwordResets: {
              select: {
                id: true,
                user_id: true,
                token: true,
                expires_at: true,
              },
            },
            emailVerifications: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                citizen_id: true,
                token: true,
                expires_at: true,
                is_used: true,
              },
            },
            auditTargets: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                actor_id: true,
                target_id: true,
                action_type: true,
                reason: true,
                ip_address: true,
              },
            },
            articleViews: {
              select: {
                id: true,
                created_at: true,
                article_id: true,
                user_id: true,
                user_type: true,
              },
            },
            comments: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                author_id: true,
                content: true,
                article_id: true,
              },
            },
            articles: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
                section_id: true,
                author_id: true,
                title: true,
                content: true,
                is_deleted: true,
              },
            },
          },
        },
      },
    });
  // Return full comment object using transformer (resolution for transformer namespace)
  return await EconomicBoardCommentTransformer.transform(updatedComment);
}
