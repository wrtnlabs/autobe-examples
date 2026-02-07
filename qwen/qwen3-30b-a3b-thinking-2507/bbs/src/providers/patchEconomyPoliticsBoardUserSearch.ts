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
import { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import { IPageIEconomyPoliticsBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardSearchResult";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconomyPoliticsBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchResult";
import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import { UserPayload } from "../decorators/payload/UserPayload"

export async function patchEconomyPoliticsBoardUserSearch(props: {
    user: UserPayload;
    body: IEconomyPoliticsBoardSearchQuery.IRequest;
}): Promise<IPageIEconomyPoliticsBoardSearchResult.ISummary> {
    const page = 1;
    const size = 10;
    const normalizedPage = Math.max(1, page);
    const normalizedSize = Math.max(1, size);
    const data = await MyGlobal.prisma.economy_politics_board_search_results.findMany({
        where: { deleted_at: null },
        take: normalizedSize,
        skip: (normalizedPage - 1) * normalizedSize,
        orderBy: { created_at: 'desc' },
        select: {
            id: true,
            articles_id: true,
            article_tags_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
        },
    });
    const total = await MyGlobal.prisma.economy_politics_board_search_results.count({
        where: { deleted_at: null },
    });
    const pagination = {
        current: normalizedPage,
        limit: normalizedSize,
        records: total,
        pages: Math.ceil(total / normalizedSize),
        satisfies, IPage, : .IPagination,
        const: transformedData = data.map(async (item) => {
            const article = await MyGlobal.prisma.economy_politics_board_articles.findUnique({
                where: { id: item.articles_id },
                select: {
                    id: true,
                    title: true,
                    author: {
                        select: {
                            id: true,
                            email: true,
                            created_at: true,
                            updated_at: true,
                            deleted_at: true,
                        },
                    },
                    section: { select: { id: true, name: true, description: true },
                        created_at: true,
                        comments_count: true,
                    },
                }
            });
            const tag = await MyGlobal.prisma.economy_politics_board_article_tags.findUnique({
                where: { id: item.article_tags_id },
                select: {
                    id: true,
                    tag: true,
                    created_at: true,
                    updated_at: true,
                },
            });
            return {
                id: item.id,
                article: {
                    id: article.id,
                    title: article.title,
                    author: {
                        id: article.author.id,
                        email: article.author.email,
                        created_at: article.author.created_at,
                        updated_at: article.author.updated_at,
                        deleted_at: article.author.deleted_at,
                    },
                    section: {
                        id: article.section.id,
                        name: article.section.name,
                        description: article.section.description,
                    },
                    comments_count: article.comments_count,
                    created_at: article.created_at,
                },
                tag: {
                    id: tag.id,
                    tag: tag.tag,
                    created_at: tag.created_at,
                    updated_at: tag.updated_at,
                },
                created_at: item.created_at,
                updated_at: item.updated_at,
                deleted_at: item.deleted_at,
            };
        }),
        return: {
            pagination,
            data: await Promise.all(transformedData),
        }
    };
}
