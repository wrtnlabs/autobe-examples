import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformReportAtSummaryTransformer {
  export type Payload = Prisma.community_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        reporter: {
          select: {
            username: true,
          },
        },
        post: {
          select: {
            id: true,
          },
        },
        comment: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.community_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReport.ISummary> {
    return {
      report_id: input.id,
      target_entity_id: input.post
        ? input.post.id
        : input.comment
          ? input.comment.id
          : "00000000-0000-0000-0000-000000000000",
      target_type: input.post ? "post" : input.comment ? "comment" : "comment",
      status: input.status as "Pending" | "Approved" | "Dismissed",
      reporter_username: input.reporter.username,
      created_at: input.created_at.toISOString(),
    };
  }
}
