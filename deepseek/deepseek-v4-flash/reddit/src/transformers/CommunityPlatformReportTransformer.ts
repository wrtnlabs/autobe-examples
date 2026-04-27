import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportCommentTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCommentTarget";
import { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformReportCommentTargetTransformer } from "./CommunityPlatformReportCommentTargetTransformer";
import { CommunityPlatformReportPostTargetTransformer } from "./CommunityPlatformReportPostTargetTransformer";

export namespace CommunityPlatformReportTransformer {
  export type Payload = Prisma.community_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        target_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        reportPostTarget: CommunityPlatformReportPostTargetTransformer.select(),
        commentTarget: CommunityPlatformReportCommentTargetTransformer.select(),
      },
    } satisfies Prisma.community_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReport> {
    return {
      id: input.id,
      reason: input.reason,
      target_type: input.target_type as "post" | "comment",
      status: input.status as "pending" | "approved" | "dismissed",
      reporter: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      reportPostTarget: input.reportPostTarget
        ? await CommunityPlatformReportPostTargetTransformer.transform(
            input.reportPostTarget,
          )
        : undefined,
      commentTarget: input.commentTarget
        ? await CommunityPlatformReportCommentTargetTransformer.transform(
            input.commentTarget,
          )
        : undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies ICommunityPlatformReport;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformReportTransformer {
//       export type Payload = Prisma.community_platform_reportsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             target_type: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reporter: CommunityPlatformMemberAtSummaryTransformer.select(),
//             community: CommunityPlatformCommunityAtSummaryTransformer.select(),
//             reportPostTarget: CommunityPlatformReportPostTargetTransformer.select(),
//             commentTarget: CommunityPlatformReportCommentTargetTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformReport> {
//         return {
//   id: {string},
//   reason: {string},
//   target_type: {"post" | "comment"},
//   status: {"pending" | "approved" | "dismissed"},
//   reporter: await CommunityPlatformMemberAtSummaryTransformer.transform(input.reporter),
//   community: await CommunityPlatformCommunityAtSummaryTransformer.transform(input.community),
//   reportPostTarget: await CommunityPlatformReportPostTargetTransformer.transform(input.reportPostTarget),
//   commentTarget: await CommunityPlatformReportCommentTargetTransformer.transform(input.commentTarget),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------