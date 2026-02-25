import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditMemberAtSummaryTransformer } from "./RedditMemberAtSummaryTransformer";

export namespace RedditReportResolutionTransformer {
  export type Payload = Prisma.reddit_report_resolutionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        resolution_type: true,
        dismissal_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: RedditMemberAtSummaryTransformer.select(),
        report: true,
      },
    } satisfies Prisma.reddit_report_resolutionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditReportResolution> {
    return {
      id: input.id,
      resolutionType: input.resolution_type,
      dismissalReason: input.dismissal_reason ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      moderator: await RedditMemberAtSummaryTransformer.transform(
        input.moderator,
      ),
    };
  }
}
