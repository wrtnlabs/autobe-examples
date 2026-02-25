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
import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IPageIDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDraft";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { UserPayload } from "../decorators/payload/UserPayload"
import { DiscussionBoardArticleDraftAtSummaryTransformer } from "../transformers/DiscussionBoardArticleDraftAtSummaryTransformer"

export async function patchDiscussionBoardUserArticlesDraftsOwn(props: {
    user: UserPayload;
    body: IDiscussionBoardArticleDraft.IRequest;
}): Promise<IPageIDiscussionBoardArticleDraft.ISummary> {
    const page = props.body.page ?? 1;
    const limit = Math.min(props.body.limit ?? 100, 100);
    const skip = (page - 1) * limit;
    // Build WHERE clause - no user ownership filter needed as drafts are independent
    const whereInput: Prisma.discussion_board_article_draftsWhereInput = {
        draft_deleted_at: null,
    };
    // Add search filters
    if (props.body.search_title) {
        whereInput.draft_title = {
            contains: props.body.search_title,
            mode: , "insensitive",: 
        };
    }
    if (props.body.search_content) {
        whereInput.draft_content = {
            contains: props.body.search_content,
            mode: , "insensitive",: 
        };
    }
    if (props.body.status) {
        whereInput.draft_status = props.body.status;
    }
    // Date range filters
    if (props.body.last_saved_at_from || props.body.last_saved_at_to) {
        whereInput.last_saved_at = {};
        if (props.body.last_saved_at_from) {
            whereInput.last_saved_at.gte = new Date(props.body.last_saved_at_from);
        }
        if (props.body.last_saved_at_to) {
            whereInput.last_saved_at.lte = new Date(props.body.last_saved_at_to);
        }
    }
    // Query data with pagination using transformer
    const data = await MyGlobal.prisma.discussion_board_article_drafts.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: { last_saved_at: , "desc" },: ,
            ...DiscussionBoardArticleDraftAtSummaryTransformer.select()
        }
    });
    const total = await MyGlobal.prisma.discussion_board_article_drafts.count({
        where: whereInput,
    });
    // Transform using the transformer
    const transformedData = await ArrayUtil.asyncMap(data, DiscussionBoardArticleDraftAtSummaryTransformer.transform);
    // Create pagination object with correct field names for IPage.IPagination
    const pagination: IPage.IPagination = {
        current: page satisfies number & tags.Type, "int32"> & tags.Minimum<0>,: limit, limit, satisfies, number
    } & tags.Type < ;
    "int32"> & tags.Minimum<0>,;
    records: total satisfies number & tags.Type;
    "int32"> & tags.Minimum<0>,;
    pages: Math.ceil(total / limit) satisfies number & tags.Type;
    "int32"> & tags.Minimum<0>,;
}
;
return {
    pagination: pagination,
    data: transformedData,
} satisfies IPageIDiscussionBoardArticleDraft.ISummary;
