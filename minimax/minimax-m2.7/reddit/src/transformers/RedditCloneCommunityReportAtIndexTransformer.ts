import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityBanAtSummaryTransformer } from "./RedditCloneCommunityBanAtSummaryTransformer";
import { RedditCloneMemberSessionAtSummaryTransformer } from "./RedditCloneMemberSessionAtSummaryTransformer";

export namespace RedditCloneCommunityReportAtIndexTransformer {
  export type Payload = Prisma.reddit_clone_community_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        target_id: true,
        reason: true,
        status: true,
        resolution_note: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        reporter: RedditCloneMemberSessionAtSummaryTransformer.select(),
        community: RedditCloneCommunityBanAtSummaryTransformer.select(),
        resolvedBy: RedditCloneMemberSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityReport.IIndex> {
    return {
      id: input.id,
      targetType: input.target_type as "post" | "comment",
      targetId: input.target_id,
      targetPreview: undefined,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "dismissed",
      resolutionNote: input.resolution_note ?? null,
      resolvedAt: input.resolved_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      reporter: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.reporter,
      ),
      community: await RedditCloneCommunityBanAtSummaryTransformer.transform(
        input.community,
      ),
      resolvedBy: input.resolvedBy
        ? await RedditCloneMemberSessionAtSummaryTransformer.transform(
            input.resolvedBy,
          )
        : null,
    };
  }
}
