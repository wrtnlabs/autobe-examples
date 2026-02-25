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
import { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload"

export async function patchDiscussionBoardSuperAdminAnalytics(props: {
    superAdmin: SuperAdminPayload;
    body: IDiscussionBoardSystemActivity.IRequest;
}): Promise<IPageIDiscussionBoardSystemActivity.ISummary> {
    const page = props.body.page ?? 1;
    const limit = props.body.limit ?? 50;
    const skip = (page - 1) * limit;
    const whereInput: Prisma.discussion_board_system_activitiesWhereInput = {
        ...(props.body.activity_type && {
            activity_type: props.body.activity_type,
        }),
        ...(props.body.target_entity_type && {
            target_entity_type: props.body.target_entity_type,
        }),
        ...(props.body.target_entity_id && {
            target_entity_id: props.body.target_entity_id,
        }),
        ...(props.body.success_status !== undefined && props.body.success_status !== null && {
            success_status: props.body.success_status,
        }),
        ...(props.body.user_id && { user_id: props.body.user_id }),
        ...(props.body.admin_id && { admin_id: props.body.admin_id }),
        ...(props.body.super_admin_id && {
            super_admin_id: props.body.super_admin_id,
        }),
        ...(props.body.created_at_from && {
            created_at: { gte: props.body.created_at_from },
        }),
        ...(props.body.created_at_to && {
            created_at: { lte: props.body.created_at_to },
        }),
        ...(props.body.search && {
            OR: [
                { activity_type: { contains: props.body.search, mode: , "insensitive" } },: {
                            target_entity_type: {
                                contains: props.body.search,
                                mode: , "insensitive",: 
                            },
                        }, } },
                {
                    activity_details: {
                        contains: props.body.search,
                        mode: , "insensitive",: 
                    },
                },
            ],
        }),
    };
    const data = await MyGlobal.prisma.discussion_board_system_activities.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: , "desc" },: include }
    }, {
        user: {
            select: {
                id: true,
                display_name: true,
                bio: true,
                created_at: true,
            },
        },
        admin: {
            select: {
                id: true,
                email: true,
                display_name: true,
                created_at: true,
            },
        },
        super_admin: {
            include: {
                admin: {
                    select: {
                        id: true,
                        email: true,
                        display_name: true,
                        created_at: true,
                    },
                },
            },
        },
    });
}
;
const total = await MyGlobal.prisma.discussion_board_system_activities.count({
    where: whereInput,
});
const transformedData = data.map((item) => ({
    id: item.id,
    activity_type: item.activity_type,
    target_entity_type: item.target_entity_type ?? null,
    target_entity_id: item.target_entity_id ? item.target_entity_id : null,
    success_status: item.success_status,
    created_at: toISOStringSafe(item.created_at),
    user: item.user
        ? ({
            id: item.user.id,
            display_name: item.user.display_name,
            bio: item.user.bio ?? null,
            created_at: toISOStringSafe(item.user.created_at),
        } satisfies IDiscussionBoardUser.ISummary)
        : null,
    admin: item.admin
        ? ({
            id: item.admin.id,
            email: item.admin.email,
            display_name: item.admin.display_name,
            created_at: toISOStringSafe(item.admin.created_at),
        } satisfies IDiscussionBoardAdmin.ISummary)
        : null,
    superAdmin: item.super_admin
        ? ({
            id: item.super_admin.id,
            permission_level: , "admin",: assignment_date, toISOStringSafe(item) { }, : .super_admin.created_at
        }) : ,
    admin: item.super_admin.admin
        ? ({
            id: item.super_admin.admin.id,
            email: item.super_admin.admin.email,
            display_name: item.super_admin.admin.display_name,
            created_at: toISOStringSafe(item.super_admin.admin.created_at),
        } satisfies IDiscussionBoardAdmin.ISummary)
        : null,
    superAdmin: null,
} satisfies IDiscussionBoardSuperAdmin.ISummary));
null,
;
;
return {
    pagination: {
        page: page,
        limit: limit,
        records: total,
        pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
    data: transformedData,
};
