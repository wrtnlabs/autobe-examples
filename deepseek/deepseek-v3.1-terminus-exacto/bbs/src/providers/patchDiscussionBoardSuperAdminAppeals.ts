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
import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IPageIDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanAppeal";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload"
import { DiscussionBoardBanAppealAtSummaryTransformer } from "../transformers/DiscussionBoardBanAppealAtSummaryTransformer"

export async function patchDiscussionBoardSuperAdminAppeals(props: {
    superAdmin: SuperAdminPayload;
    body: IDiscussionBoardBanAppeal.IRequest;
}): Promise<IPageIDiscussionBoardBanAppeal.ISummary> {
    const page = props.body.page ?? 1;
    const limit = props.body.limit ?? 100;
    const skip = (page - 1) * limit;
    const whereInput = {
        deleted_at: null,
        ...(props.body.search && {
            appeal_reason: {
                contains: props.body.search,
            },
        }),
        ...(props.body.status && {
            status: props.body.status,
        }),
        ...(props.body.appealed_at_start && {
            appealed_at: {
                gte: new Date(props.body.appealed_at_start),
            },
        }),
        ...(props.body.appealed_at_end && {
            appealed_at: {
                lte: new Date(props.body.appealed_at_end),
            },
        }),
        ...(props.body.reviewed_at_start && {
            reviewed_at: {
                gte: new Date(props.body.reviewed_at_start),
            },
        }),
        ...(props.body.reviewed_at_end && {
            reviewed_at: {
                lte: new Date(props.body.reviewed_at_end),
            },
        }),
    } satisfies Prisma.discussion_board_ban_appealsWhereInput;
    const data = await MyGlobal.prisma.discussion_board_ban_appeals.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: { appealed_at: "desc" as const },
        ...DiscussionBoardBanAppealAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.discussion_board_ban_appeals.count({
        where: whereInput,
    });
    const transformedData = await ArrayUtil.asyncMap(data, DiscussionBoardBanAppealAtSummaryTransformer.transform);
    return {
        pagination: {
            current: page satisfies number & tags.Type, "int32"> & tags.Minimum<0> as number,: limit, limit, satisfies, number
        } & tags.Type < , "int32"> & tags.Minimum<0> as number,: records, total, satisfies, number
    } & tags.Type < ;
    "int32"> & tags.Minimum<0> as number,;
    pages: Math.ceil(total / limit) satisfies number & tags.Type;
    "int32"> & tags.Minimum<0> as number,;
}
satisfies;
IPage.IPagination,
    data;
transformedData,
;
satisfies;
IPageIDiscussionBoardBanAppeal.ISummary;
