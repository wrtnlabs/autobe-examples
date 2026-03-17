import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentTransformer } from "./CommunityPlatformCommentTransformer";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostTransformer } from "./CommunityPlatformPostTransformer";

export namespace CommunityPlatformReportTransformer {
  export type Payload = Prisma.community_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        reason: true,
        status: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        postTarget: {
          select: {
            post: CommunityPlatformPostTransformer.select(),
          },
        } satisfies Prisma.community_platform_report_postsFindManyArgs,
        reportComment: {
          select: {
            comment: CommunityPlatformCommentTransformer.select(),
          },
        } satisfies Prisma.community_platform_report_commentsFindManyArgs,
        resolvedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
        resolved_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReport> {
    const target =
      input.target_type === "post"
        ? await CommunityPlatformPostTransformer.transform(
            input.postTarget!.post,
          )
        : await CommunityPlatformCommentTransformer.transform(
            input.reportComment!.comment,
          );
    return {
      id: input.id,
      targetType: input.target_type,
      reason: input.reason,
      status: input.status,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      target,
      resolvedBy: input.resolvedBy
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.resolvedBy,
          )
        : null,
      resolvedAt: input.resolved_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
