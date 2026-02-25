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
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload"

export async function patchDiscussionBoardSuperAdminArticlesArticleIdTags(props: {
    superAdmin: SuperAdminPayload;
    articleId: string & tags.Format;
    "uuid">;;
    body: IDiscussionBoardArticleTag.IRequest;
}): Promise<IPageIDiscussionBoardArticleTag.ISummary> {
    // Verify article exists
    const article = await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
        where: { id: props.articleId, deleted_at: null },
    });
    // Normalize and validate tags
    const normalizedTags = [...new Set(props.body.tags)]
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length >= 1 && tag.length <= 50);
    const pageNumber = props.body.page ?? 1;
    const limit = props.body.limit ?? 100;
    const skip = (pageNumber - 1) * limit;
    const now = toISOStringSafe(new Date());
    // Use transaction for atomic updates
    await MyGlobal.prisma.$transaction(async (tx) => {
        // Get current active tags
        const currentTags = await tx.discussion_board_article_tags.findMany({
            where: {
                discussion_board_article_id: props.articleId,
                deleted_at: null,
            },
        });
        const currentTagNames = new Set(currentTags.map((t) => t.tag_name));
        const incomingTagNames = new Set(normalizedTags);
        // Soft delete tags no longer in request
        const tagsToRemove = currentTags.filter((t) => !incomingTagNames.has(t.tag_name));
        if (tagsToRemove.length > 0) {
            await tx.discussion_board_article_tags.updateMany({
                where: {
                    id: { in: tagsToRemove.map((t) => t.id) },
                },
                data: {
                    deleted_at: now,
                    updated_at: now,
                },
            });
        }
        // Create new tag associations
        const tagsToAdd = normalizedTags.filter((tag) => !currentTagNames.has(tag));
        if (tagsToAdd.length > 0) {
            await tx.discussion_board_article_tags.createMany({
                data: tagsToAdd.map((tag) => ({
                    id: v4(),
                    discussion_board_article_id: props.articleId,
                    tag_name: tag,
                    created_at: now,
                    updated_at: now,
                    deleted_at: null,
                })),
            });
        }
    });
    // Fetch updated tags with pagination
    const [data, total] = await Promise.all([
        MyGlobal.prisma.discussion_board_article_tags.findMany({
            where: {
                discussion_board_article_id: props.articleId,
                deleted_at: null,
            },
            skip,
            take: limit,
            orderBy: { tag_name: , "asc" },: 
            }
        }),
        MyGlobal.prisma.discussion_board_article_tags.count({
            where: {
                discussion_board_article_id: props.articleId,
                deleted_at: null,
            },
        }),
    ]);
    return {
        pagination: typia.assert<IPage.IPagination>({
            current: pageNumber,
            limit: limit,
            records: total,
            pages: Math.ceil(total / limit),
        }),
        data: data.map((tag) => ({
            id: tag.id as string & tags.Format, "uuid">,: tag_name, tag, : .tag_name,
            created_at: toISOStringSafe(tag.created_at),
        }) satisfies IDiscussionBoardArticleTag.ISummary),
    } satisfies IPageIDiscussionBoardArticleTag.ISummary;
}
