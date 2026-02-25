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
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload"

export async function patchDiscussionBoardSuperAdminSystemReportsAudit(props: {
    superAdmin: SuperAdminPayload;
    body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
    const page = props.body.page ?? 1;
    const limit = Math.min(props.body.limit ?? 100, 100);
    const skip = (page - 1) * limit;
    // Build WHERE conditions for each audit table with field-specific filtering
    const auditLogsWhere = {
        AND: [
            props.body.action_type
                ? { action_type: props.body.action_type }
                : undefined,
            props.body.actor_type ? { actor_type: props.body.actor_type } : undefined,
            props.body.target_user_id
                ? { target_user_id: props.body.target_user_id }
                : undefined,
            props.body.target_admin_id
                ? { target_admin_id: props.body.target_admin_id }
                : undefined,
            props.body.target_super_admin_id
                ? { target_super_admin_id: props.body.target_super_admin_id }
                : undefined,
            props.body.target_article_id
                ? { target_article_id: props.body.target_article_id }
                : undefined,
            props.body.target_comment_id
                ? { target_comment_id: props.body.target_comment_id }
                : undefined,
            props.body.target_section_id
                ? { target_section_id: props.body.target_section_id }
                : undefined,
            props.body.created_at_start && props.body.created_at_end
                ? {
                    created_at: {
                        gte: new Date(props.body.created_at_start),
                        lte: new Date(props.body.created_at_end),
                    },
                }
                : undefined,
            props.body.created_at_start && !props.body.created_at_end
                ? {
                    created_at: { gte: new Date(props.body.created_at_start) },
                }
                : undefined,
            !props.body.created_at_start && props.body.created_at_end
                ? {
                    created_at: { lte: new Date(props.body.created_at_end) },
                }
                : undefined,
            props.body.updated_at_start && props.body.updated_at_end
                ? {
                    updated_at: {
                        gte: new Date(props.body.updated_at_start),
                        lte: new Date(props.body.updated_at_end),
                    },
                }
                : undefined,
            props.body.updated_at_start && !props.body.updated_at_end
                ? {
                    updated_at: { gte: new Date(props.body.updated_at_start) },
                }
                : undefined,
            !props.body.updated_at_start && props.body.updated_at_end
                ? {
                    updated_at: { lte: new Date(props.body.updated_at_end) },
                }
                : undefined,
            props.body.success !== undefined
                ? { success: props.body.success }
                : undefined,
            props.body.search_term
                ? {
                    description: {
                        contains: props.body.search_term,
                        mode: , "insensitive" as const,: 
                    },
                }
                : undefined,
        ].filter(Boolean) as Prisma.discussion_board_audit_logsWhereInput[],
    } satisfies Prisma.discussion_board_audit_logsWhereInput;
    const moderationLogsWhere = {
        AND: [
            props.body.action_type
                ? { action_type: props.body.action_type }
                : undefined,
            props.body.actor_type === , "admin"
                ? { admin_id: { not: null } }
                : undefined,
            props.body.actor_type === , "super_admin"
                ? { super_admin_id: { not: null } }
                : undefined,
            props.body.target_user_id
                ? { target_user_id: props.body.target_user_id }
                : undefined,
            props.body.target_article_id
                ? { target_article_id: props.body.target_article_id }
                : undefined,
            props.body.target_comment_id
                ? { target_comment_id: props.body.target_comment_id }
                : undefined,
            props.body.target_section_id
                ? { target_section_id: props.body.target_section_id }
                : undefined,
            props.body.created_at_start && props.body.created_at_end
                ? {
                    performed_at: {
                        gte: new Date(props.body.created_at_start),
                        lte: new Date(props.body.created_at_end),
                    },
                }
                : undefined,
            props.body.created_at_start && !props.body.created_at_end
                ? {
                    performed_at: { gte: new Date(props.body.created_at_start) },
                }
                : undefined,
            !props.body.created_at_start && props.body.created_at_end
                ? {
                    performed_at: { lte: new Date(props.body.created_at_end) },
                }
                : undefined,
            props.body.success !== undefined
                ? {
                    status: props.body.success
                        ?  : , "completed": { in: ["failed", "cancelled"] },]
                    }
                }
                : undefined,
            props.body.search_term
                ? {
                    action_description: {
                        contains: props.body.search_term,
                        mode: , "insensitive" as const,: 
                    },
                }
                : undefined,
            { deleted_at: null },
        ].filter(Boolean) as Prisma.discussion_board_moderation_logsWhereInput[],
    } satisfies Prisma.discussion_board_moderation_logsWhereInput;
    const contentModerationLogsWhere = {
        AND: [
            props.body.action_type
                ? { action_type: props.body.action_type }
                : undefined,
            props.body.created_at_start && props.body.created_at_end
                ? {
                    created_at: {
                        gte: new Date(props.body.created_at_start),
                        lte: new Date(props.body.created_at_end),
                    },
                }
                : undefined,
            props.body.created_at_start && !props.body.created_at_end
                ? {
                    created_at: { gte: new Date(props.body.created_at_start) },
                }
                : undefined,
            !props.body.created_at_start && props.body.created_at_end
                ? {
                    created_at: { lte: new Date(props.body.created_at_end) },
                }
                : undefined,
            props.body.search_term
                ? {
                    reason: {
                        contains: props.body.search_term,
                        mode: , "insensitive" as const,: 
                    },
                }
                : undefined,
        ].filter(Boolean) as Prisma.discussion_board_content_moderation_logsWhereInput[],
    } satisfies Prisma.discussion_board_content_moderation_logsWhereInput;
    const systemActivitiesWhere = {
        AND: [
            props.body.action_type
                ? { activity_type: props.body.action_type }
                : undefined,
            props.body.actor_type === , "user" ? { user_id: { not: null } } : undefined,,
            props.body.actor_type === , "admin"
                ? { admin_id: { not: null } }
                : undefined,
            props.body.actor_type === , "super_admin"
                ? { super_admin_id: { not: null } }
                : undefined,
            props.body.created_at_start && props.body.created_at_end
                ? {
                    created_at: {
                        gte: new Date(props.body.created_at_start),
                        lte: new Date(props.body.created_at_end),
                    },
                }
                : undefined,
            props.body.created_at_start && !props.body.created_at_end
                ? {
                    created_at: { gte: new Date(props.body.created_at_start) },
                }
                : undefined,
            !props.body.created_at_start && props.body.created_at_end
                ? {
                    created_at: { lte: new Date(props.body.created_at_end) },
                }
                : undefined,
            props.body.success !== undefined
                ? {
                    success_status: props.body.success,
                }
                : undefined,
            props.body.search_term
                ? {
                    activity_details: {
                        contains: props.body.search_term,
                        mode: , "insensitive" as const,: 
                    },
                }
                : undefined,
        ].filter(Boolean) as Prisma.discussion_board_system_activitiesWhereInput[],
    } satisfies Prisma.discussion_board_system_activitiesWhereInput;
    // Execute UNION query across all audit tables
    const [auditLogsData, moderationLogsData, contentModerationLogsData, systemActivitiesData,] = await Promise.all([
        // Audit logs query
        MyGlobal.prisma.discussion_board_audit_logs.findMany({
            where: auditLogsWhere,
            skip,
            take: limit,
            orderBy: { created_at: , "desc" as const },: 
            }
        }),
        // Moderation logs query with actor joins
        MyGlobal.prisma.discussion_board_moderation_logs.findMany({
            where: moderationLogsWhere,
            skip,
            take: limit,
            orderBy: { performed_at: , "desc" as const },: include }
        }, {
            admin: { select: { id: true } },
            superAdmin: { select: { id: true } },
        })
    ]);
}
// Content moderation logs query
MyGlobal.prisma.discussion_board_content_moderation_logs.findMany({
    where: contentModerationLogsWhere,
    skip,
    take: limit,
    orderBy: { created_at: , "desc" as const },: 
    }
}),
    // System activities query
    MyGlobal.prisma.discussion_board_system_activities.findMany({
        where: systemActivitiesWhere,
        skip,
        take: limit,
        orderBy: { created_at: , "desc" as const },: 
        }
    }),
;
;
// Get total counts for pagination
const [totalAuditLogs, totalModerationLogs, totalContentModerationLogs, totalSystemActivities,] = await Promise.all([
    MyGlobal.prisma.discussion_board_audit_logs.count({
        where: auditLogsWhere,
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.count({
        where: moderationLogsWhere,
    }),
    MyGlobal.prisma.discussion_board_content_moderation_logs.count({
        where: contentModerationLogsWhere,
    }),
    MyGlobal.prisma.discussion_board_system_activities.count({
        where: systemActivitiesWhere,
    }),
]);
const totalRecords = totalAuditLogs +
    totalModerationLogs +
    totalContentModerationLogs +
    totalSystemActivities;
// Transform records from all tables to unified ISummary DTO
const auditLogsSummaries = auditLogsData.map((log) => ({
    id: log.id as string & tags.Format, "uuid">,: action_type, log, : .action_type,
    action_subtype: log.action_subtype ?? null,
    description: log.description,
    success: log.success,
    created_at: toISOStringSafe(log.created_at) as string & tags.Format, "date-time">,: actor_type, log, : .actor_type,
    target_user_id: log.target_user_id as (string & tags.Format), "uuid">) | null,: target_admin_id, log, : .target_admin_id as (string & tags.Format), "uuid">): 
        | null,
    target_super_admin_id: log.target_super_admin_id as (string & tags.Format), "uuid">): 
        | null,
    target_article_id: log.target_article_id as (string & tags.Format), "uuid">): 
        | null,
    target_comment_id: log.target_comment_id as (string & tags.Format), "uuid">): 
        | null,
    target_section_id: log.target_section_id as (string & tags.Format), "uuid">): 
        | null,
}));
const moderationLogsSummaries = moderationLogsData.map((log) => ({
    id: log.id as string & tags.Format, "uuid">,: action_type, log, : .action_type,
    action_subtype: null,
    description: log.action_description,
    success: log.status === , "completed",: created_at, toISOStringSafe(log) { }, : .performed_at
}) as string & tags.Format, "date-time">,, actor_type, log.super_admin_id ?  : , "super_admin" : "admin",, target_user_id, log.target_user_id as (string & tags.Format), "uuid">) | null,, target_admin_id, log.admin_id as (string & tags.Format), "uuid">) | null,, target_super_admin_id, log.super_admin_id as (string & tags.Format), "uuid">)
    | null, target_article_id, log.target_article_id as (string & tags.Format), "uuid">)
    | null, target_comment_id, log.target_comment_id as (string & tags.Format), "uuid">)
    | null, target_section_id, log.target_section_id as (string & tags.Format), "uuid">)
    | null);
;
const contentModerationLogsSummaries = contentModerationLogsData.map((log) => ({
    id: log.id as string & tags.Format, "uuid">,: action_type, log, : .action_type,
    action_subtype: null,
    description: log.reason || `Content moderation: ${log.target_content_type}`,
    success: true, // Content moderation logs are always successful actions
    created_at: toISOStringSafe(log.created_at) as string & tags.Format, "date-time">,: actor_type, "admin",: target_user_id, null: ,
    target_admin_id: log.admin_id as (string & tags.Format), "uuid">) | null,: target_super_admin_id, null: ,
    target_article_id: log.target_content_type === , "article"?(log) { }, : .target_content_id as (string & tags.Format), "uuid">) | null): null,
    target_comment_id: log.target_content_type === , "comment"?(log) { }, : .target_content_id as (string & tags.Format), "uuid">) | null): null,
    target_section_id: null,
}));
const systemActivitiesSummaries = systemActivitiesData.map((log) => ({
    id: log.id as string & tags.Format, "uuid">,: action_type, log, : .activity_type,
    action_subtype: null,
    description: log.activity_details || `System activity: ${log.activity_type}`,
    success: log.success_status,
    created_at: toISOStringSafe(log.created_at) as string & tags.Format, "date-time">,: actor_type, log, : .super_admin_id
        ?  : , "super_admin": log.admin_id
        ?  : , "admin": , "user",: target_user_id, log, : .user_id as (string & tags.Format), "uuid">) | null,: target_admin_id, log, : .admin_id as (string & tags.Format), "uuid">) | null,: target_super_admin_id, log, : .super_admin_id as (string & tags.Format), "uuid">): 
        | null,
    target_article_id: log.target_entity_type === , "article"?(log) { }, : .target_entity_id as (string & tags.Format), "uuid">) | null): null,
    target_comment_id: log.target_entity_type === , "comment"?(log) { }, : .target_entity_id as (string & tags.Format), "uuid">) | null): null,
    target_section_id: log.target_entity_type === , "section"?(log) { }, : .target_entity_id as (string & tags.Format), "uuid">) | null): null,
}));
// Combine all summaries and sort by created_at descending
const allSummaries = [
    ...auditLogsSummaries,
    ...moderationLogsSummaries,
    ...contentModerationLogsSummaries,
    ...systemActivitiesSummaries,
]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
// Fix pagination structure - use correct property names for IPage.IPagination
const pagination: IPage.IPagination = {
    page: (Math.max(page, 1) satisfies number) as number & tags.Type, "int32"> & tags.Minimum<0>,: limit
}(limit satisfies number) as number & tags.Type;
"int32"> & tags.Minimum<0>,;
total: (totalRecords satisfies number) as number & tags.Type;
"int32"> & tags.Minimum<0>,;
pages: ((Math.ceil(totalRecords / limit) || 1) satisfies number) as number & tags.Type;
"int32"> & tags.Minimum<0>,;
;
// Build the correct return object matching IPageIDiscussionBoardAuditLog.ISummary
return {
    pagination,
    data: allSummaries,
};
