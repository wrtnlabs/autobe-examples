import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAuditLogTransformer {
  export type Payload = Prisma.discussion_board_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        action_type: true,
        action_subtype: true,
        description: true,
        ip_address: true,
        user_agent: true,
        metadata: true,
        success: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        actor: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
          },
        } satisfies Prisma.discussion_board_usersFindManyArgs,
        targetUser: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
          },
        } satisfies Prisma.discussion_board_usersFindManyArgs,
        targetAdmin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        } satisfies Prisma.discussion_board_adminsFindManyArgs,
        targetSuperAdmin: {
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        } satisfies Prisma.discussion_board_super_adminsFindManyArgs,
        targetArticle: {
          select: {
            id: true,
            title: true,
            status: true,
            created_at: true,
            author: {
              select: {
                id: true,
                display_name: true,
                bio: true,
                created_at: true,
              },
            } satisfies Prisma.discussion_board_usersFindManyArgs,
            section: {
              select: {
                id: true,
                name: true,
                description: true,
                status: true,
                display_order: true,
                deleted_at: true,
              },
            } satisfies Prisma.discussion_board_sectionsFindManyArgs,
          },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
        targetComment: {
          select: {
            id: true,
            content: true,
            created_at: true,
            updated_at: true,
            author: {
              select: {
                id: true,
                display_name: true,
                bio: true,
                created_at: true,
              },
            } satisfies Prisma.discussion_board_usersFindManyArgs,
          },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
        targetSection: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            display_order: true,
            deleted_at: true,
          },
        } satisfies Prisma.discussion_board_sectionsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAuditLog> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      action_type: input.action_type,
      action_subtype: input.action_subtype ?? undefined,
      description: input.description,
      ip_address: input.ip_address ?? undefined,
      user_agent: input.user_agent ?? undefined,
      metadata: input.metadata ?? undefined,
      success: input.success,
      error_message: input.error_message ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      actor: await transformActor(input),
      targetUser: input.targetUser
        ? {
            id: input.targetUser.id,
            display_name: input.targetUser.display_name,
            bio: input.targetUser.bio ?? null,
            created_at: toISOStringSafe(input.targetUser.created_at),
          }
        : undefined,
      targetAdmin: input.targetAdmin
        ? {
            id: input.targetAdmin.id,
            email: input.targetAdmin.email,
            display_name: input.targetAdmin.display_name,
            created_at: toISOStringSafe(input.targetAdmin.created_at),
          }
        : undefined,
      targetSuperAdmin: input.targetSuperAdmin
        ? {
            id: input.targetSuperAdmin.id,
            permission_level: "", // Placeholder - need correct DTO structure
            assignment_date: toISOStringSafe(input.targetSuperAdmin.created_at),
            admin: null,
            superAdmin: null,
          }
        : undefined,
      targetArticle: input.targetArticle
        ? {
            id: input.targetArticle.id,
            title: input.targetArticle.title,
            status: input.targetArticle.status,
            created_at: toISOStringSafe(input.targetArticle.created_at),
            author: {
              id: input.targetArticle.author.id,
              display_name: input.targetArticle.author.display_name,
              bio: input.targetArticle.author.bio ?? null,
              created_at: toISOStringSafe(
                input.targetArticle.author.created_at,
              ),
            },
            section: {
              id: input.targetArticle.section.id,
              name: input.targetArticle.section.name,
              description: input.targetArticle.section.description,
              status: input.targetArticle.section.status,
              display_order: input.targetArticle.section.display_order,
              deleted_at: input.targetArticle.section.deleted_at
                ? toISOStringSafe(input.targetArticle.section.deleted_at)
                : null,
            },
          }
        : undefined,
      targetComment: input.targetComment
        ? {
            id: input.targetComment.id,
            content: input.targetComment.content,
            author: {
              id: input.targetComment.author.id,
              display_name: input.targetComment.author.display_name,
              bio: input.targetComment.author.bio ?? null,
              created_at: toISOStringSafe(
                input.targetComment.author.created_at,
              ),
            },
            created_at: toISOStringSafe(input.targetComment.created_at),
            updated_at: toISOStringSafe(input.targetComment.updated_at),
          }
        : undefined,
      targetSection: input.targetSection
        ? {
            id: input.targetSection.id,
            name: input.targetSection.name,
            description: input.targetSection.description,
            status: input.targetSection.status,
            display_order: input.targetSection.display_order,
            deleted_at: input.targetSection.deleted_at
              ? toISOStringSafe(input.targetSection.deleted_at)
              : null,
          }
        : undefined,
    };
  }
  async function transformActor(
    input: Payload,
  ): Promise<
    | IDiscussionBoardUser.ISummary
    | IDiscussionBoardAdmin.ISummary
    | IDiscussionBoardSuperAdmin.ISummary
    | null
    | undefined
  > {
    if (!input.actor) {
      return undefined;
    }
    switch (input.actor_type) {
      case "user":
        return {
          id: input.actor.id,
          display_name: input.actor.display_name,
          bio: input.actor.bio ?? null,
          created_at: toISOStringSafe(input.actor.created_at),
        } satisfies IDiscussionBoardUser.ISummary;
      case "admin":
        if (input.targetAdmin) {
          return {
            id: input.targetAdmin.id,
            email: input.targetAdmin.email,
            display_name: input.targetAdmin.display_name,
            created_at: toISOStringSafe(input.targetAdmin.created_at),
          } satisfies IDiscussionBoardAdmin.ISummary;
        }
        return undefined;
      case "super_admin":
        if (input.targetSuperAdmin) {
          return {
            id: input.targetSuperAdmin.id,
            permission_level: "", // Placeholder - need correct DTO structure
            assignment_date: toISOStringSafe(input.targetSuperAdmin.created_at),
            admin: null,
            superAdmin: null,
          } satisfies IDiscussionBoardSuperAdmin.ISummary;
        }
        return undefined;
      case "system":
        return undefined;
      default:
        return undefined;
    }
  }
}
