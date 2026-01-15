import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardChannelAtSummaryTransformer } from "./DiscussionBoardChannelAtSummaryTransformer";

export namespace DiscussionBoardArticleAtSummaryTransformer {
    export type Payload = Prisma.discussion_board_articlesGetPayload<ReturnType<typeof select>>;
    export function select() {
        return {
            select: {
                id: true,
                title: true,
                created_at: true,
                member: DiscussionBoardMemberAtSummaryTransformer.select(),
                channel: DiscussionBoardChannelAtSummaryTransformer.select(),
                _count: {
                    select: {
                        discussion_board_article_images: true,
                    },
                },
            },
            satisfies, Prisma, : .discussion_board_articlesFindManyArgs
        };
        export async function transform(input: Payload): Promise<IDiscussionBoardArticle.ISummary> {
            return {
                id: input.id,
                title: input.title,
                author: await DiscussionBoardMemberAtSummaryTransformer.transform(input.member),
                category: await DiscussionBoardChannelAtSummaryTransformer.transform(input.channel),
                created_at: toISOStringSafe(input.created_at),
                comments_count: input._count?.discussion_board_article_images ?? 0,
            };
        }
    }
}