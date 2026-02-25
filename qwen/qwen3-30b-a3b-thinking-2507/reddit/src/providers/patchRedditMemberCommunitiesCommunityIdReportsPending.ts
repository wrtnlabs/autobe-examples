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
import { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { IPageIRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload"
import { RedditReportAtSummaryTransformer } from "../transformers/RedditReportAtSummaryTransformer"

export async function patchRedditMemberCommunitiesCommunityIdReportsPending(props: {
    member: MemberPayload;
    communityId: string;
    body: IRedditReport.IRequest;
}): Promise<IPageIRedditReport.ISummary> {
    const community = await MyGlobal.prisma.reddit_communities.findUnique({
        where: { id: props.communityId },
    });
    if (!community) {
        throw new HttpException("Community not found", 404);
    }
    if (community.reddit_member_id !== props.member.id) {
        throw new HttpException("You are not a moderator for this community", 403);
    }
    const page = props.body.page ?? 1;
    const limit = props.body.limit ?? 20;
    const skip = (page - 1) * limit;
    const whereInput = {
        status: "pending",
        community_id: props.communityId,
        ...(props.body.reporterId && { reddit_member_id: props.body.reporterId }),
        ...(props.body.minCreatedAt && {
            created_at: { gte: props.body.minCreatedAt },
        }),
        ...(props.body.maxCreatedAt && {
            created_at: { lte: props.body.maxCreatedAt },
        }),
        satisfies, Prisma, : .reddit_reportsWhereInput,
        const: data = await MyGlobal.prisma.reddit_reports.findMany({
            where: whereInput,
            skip,
            take: limit,
            orderBy: { created_at: "desc" },
            select: {
                id: true,
                reason: true,
                status: true,
                created_at: true,
                reddit_member_id: true,
                resolutions: true,
                moderationLogs: true,
                reporter: true
            }
        }),
        const: total = await MyGlobal.prisma.reddit_reports.count({
            where: whereInput,
        }),
        const: transformedData = await ArrayUtil.asyncMap(data, RedditReportAtSummaryTransformer.transform),
        return: {
            data: transformedData,
            pagination: {
                current: page,
                limit,
                records: total,
                pages: Math.ceil(total / limit),
            },
            satisfies, IPageIRedditReport, : .ISummary
        }
    };
}
