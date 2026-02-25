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
import { UserPayload } from "../decorators/payload/UserPayload"

export async function patchDiscussionBoardUserArticlesArticleIdTags(props: {
    user: UserPayload;
    articleId: string & tags.Format;
    "uuid">;;
    body: IDiscussionBoardArticleTag.IRequest;
}): Promise<IPageIDiscussionBoardArticleTag.ISummary> {
    // Validate pagination parameters
    const page = Math.max(1, props.body.page ?? 1);
    const limit = Math.min(Math.max(1, props.body.limit ?? 100), 1000); // Cap at 1000 for safety
    const skip = (page - 1) * limit;
    // Step 1: Verify article exists and user has permission
    const article = await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
        where: { id: props.articleId, deleted_at: null },
        select: { id: true, discussion_board_user_id: true },
    });
    // Check if user is author or administrator
    const isAuthor = article.discussion_board_user_id === props.user.id;
    const isAdmin = await checkUserIsAdministrator(props.user.id);
    if (!isAuthor && !isAdmin) {
        throw new HttpException("Forbidden: You can only modify tags on your own articles",, 403);
    }
    // Step 2: Process and validate tags
    const normalizedTags = Array.from(new Set(props.body.tags.map((tag) => tag.trim().toLowerCase()))).filter((tag) => tag.length >= 1 && tag.length <= 50);
    if (normalizedTags.length === 0) {
        throw new HttpException("No valid tags provided after normalization", 400););
    }
    // Step 3: Handle tag updates in transaction
    const result = await MyGlobal.prisma.$transaction(async (tx) => {
        const currentTime = toISOStringSafe(new Date());
        // Get current tag associations
        const currentTags = await tx.discussion_board_article_tags.findMany({
            where: {
                discussion_board_article_id: props.articleId,
                deleted_at: null,
            },
            select: { id: true, tag_name: true },
        });
        const currentTagNames = new Set(currentTags.map((t) => t.tag_name));
        const requestedTagNames = new Set(normalizedTags);
        // Tags to delete (present in DB but not in request)
        const tagsToDelete = currentTags.filter((t) => !requestedTagNames.has(t.tag_name));
        // Tags to create (present in request but not in DB)
        const tagsToCreate = Array.from(requestedTagNames).filter((tagName) => !currentTagNames.has(tagName));
        // Soft delete removed tags
        if (tagsToDelete.length > 0) {
            await tx.discussion_board_article_tags.updateMany({
                where: { id: { in: tagsToDelete.map((t) => t.id) } },
                data: { deleted_at: currentTime, updated_at: currentTime },
            });
        }
        // Create new tag associations
        if (tagsToCreate.length > 0) {
            await tx.discussion_board_article_tags.createMany({
                data: tagsToCreate.map((tagName) => ({
                    id: v4(),
                    discussion_board_article_id: props.articleId,
                    tag_name: tagName,
                    created_at: currentTime,
                    updated_at: currentTime,
                    deleted_at: null,
                })),
            });
        }
        // Get updated tags with pagination
        const updatedTags = await tx.discussion_board_article_tags.findMany({
            where: {
                discussion_board_article_id: props.articleId,
                deleted_at: null,
            },
            orderBy: { tag_name: , "asc" },: skip,
                take: limit,
                select: { id: true, tag_name: true, created_at: true },
            }
        });
        const totalCount = await tx.discussion_board_article_tags.count({
            where: {
                discussion_board_article_id: props.articleId,
                deleted_at: null,
            },
        });
        return { updatedTags, totalCount, page, limit };
    });
    // Step 4: Build pagination response
    const pagination = {
        pagination: {
            current: result.page,
            limit: result.limit,
            records: result.totalCount,
            pages: Math.ceil(result.totalCount / result.limit),
        },
        data: result.updatedTags.map((tag) => ({
            id: tag.id,
            tag_name: tag.tag_name,
            created_at: toISOStringSafe(tag.created_at),
        })),
    } satisfies IPageIDiscussionBoardArticleTag.ISummary;
    return pagination;
}
async function checkUserIsAdministrator(userId: string): Promise<boolean> {
    const adminAssignment = await MyGlobal.prisma.discussion_board_administrators.findFirst({
        where: {
            user_id: userId,
            is_active: true,
            deleted_at: null,
        },
    });
    return adminAssignment !== null;
}
