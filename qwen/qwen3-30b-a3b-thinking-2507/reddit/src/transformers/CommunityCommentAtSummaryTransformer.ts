import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityCommentAtSummaryTransformer {
    export type Payload = Prisma.community_commentsGetPayload<ReturnType<typeof select>>;
    export function select() {
        return {
            select: {
                id: true,
                content: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                author: CommunityMemberAtSummaryTransformer.select(),
                post: true,
                parent: true,
                community_votes: { _count: true },
                community_reports: true,
            },
            satisfies, Prisma, : .community_commentsFindManyArgs
        };
        export async function transform(input: Payload): Promise<ICommunityComment.ISummary> {
            return {
                id: input.id,
                content: input.content.substring(0, 100),
                author: await CommunityMemberAtSummaryTransformer.transform(input.author),
                created_at: toISOStringSafe(input.created_at),
                updated_at: toISOStringSafe(input.updated_at),
                voteCount: input.community_votes?._count?.count ?? 0,
            };
        }
    }
}