import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityBanAtSummaryTransformer } from "./RedditCloneCommunityBanAtSummaryTransformer";
import { RedditCloneMemberSessionAtSummaryTransformer } from "./RedditCloneMemberSessionAtSummaryTransformer";

export namespace RedditCloneReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_reportsGetPayload<
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
        created_at: true,
        updated_at: true,
        reporter: RedditCloneMemberSessionAtSummaryTransformer.select(),
        community: RedditCloneCommunityBanAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneReport.ISummary> {
    return {
      id: input.id,
      target_type: input.target_type as "post" | "comment",
      target_id: input.target_id,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "dismissed",
      created_at: input.created_at.toISOString(),
      community: await RedditCloneCommunityBanAtSummaryTransformer.transform(
        input.community,
      ),
      post_title: undefined,
      post_content: undefined,
      comment_content: undefined,
    };
  }
}
