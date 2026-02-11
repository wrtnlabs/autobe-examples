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
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload"
import { RedditCommunityCommentReportTransformer } from "../transformers/RedditCommunityCommentReportTransformer"

export async function postRedditCommunityCommunityModeratorReportsReportIdAction(props: {
    communityModerator: CommunitymoderatorPayload;
    reportId: string & tags.Format<"uuid">;
    body: IRedditCommunityCommentReport.IRequest;
}): Promise<IRedditCommunityCommentReport> {
    // Validate action type
    if (props.body.status !== "approved" && props.body.status !== "dismissed") {
        throw new HttpException("Invalid action. Must be "approved" or "dismissed".", 400);
    }
    // Find the report
    const report = await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
        where: { id: props.reportId },
    });
    if (!report) {
        throw new HttpException("Report not found", 404);
    }
    if (report.status !== "pending") {
        throw new HttpException("Report already resolved", 400);
    }
    // Process action in transaction
    return await MyGlobal.prisma.$transaction(async (prisma) => {
        const now = toISOStringSafe(new Date());
        let updatedReport: Prisma.reddit_community_comment_reportsGetPayload<ReturnType<typeof RedditCommunityCommentReportTransformer.select>>;
        if (props.body.status === "approved") {
            // Update report status to approved and set resolved_at
            updatedReport = await prisma.reddit_community_comment_reports.update({
                where: { id: props.reportId },
                data: {
                    status: "approved",
                    resolved_at: now,
                },
                ...RedditCommunityCommentReportTransformer.select(),
            });
            // Create moderation action audit log
            await prisma.reddit_community_moderation_actions.create({
                data: {
                    id: v4(),
                    actor_id: props.communityModerator.id,
                    action_type: "delete",
                    target_type: "comment",
                    reason: report.reason,
                    created_at: now,
                },
            });
        }
        else { // dismissed
            // Update report status to dismissed and set resolved_at
            updatedReport = await prisma.reddit_community_comment_reports.update({
                where: { id: props.reportId },
                data: {
                    status: "dismissed",
                    resolved_at: now,
                },
                ...RedditCommunityCommentReportTransformer.select(),
            });
            // Create moderation action audit log
            await prisma.reddit_community_moderation_actions.create({
                data: {
                    id: v4(),
                    actor_id: props.communityModerator.id,
                    action_type: "dismiss",
                    target_type: "comment",
                    reason: report.reason,
                    created_at: now,
                },
            });
        }
        return RedditCommunityCommentReportTransformer.transform(updatedReport);
    });
}
