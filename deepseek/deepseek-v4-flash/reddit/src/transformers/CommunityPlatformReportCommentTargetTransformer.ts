import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportCommentTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCommentTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentTransformer } from "./CommunityPlatformCommentTransformer";
import { CommunityPlatformReportAtSummaryTransformer } from "./CommunityPlatformReportAtSummaryTransformer";

export namespace CommunityPlatformReportCommentTargetTransformer {
  export type Payload =
    Prisma.community_platform_report_comment_targetsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        report: CommunityPlatformReportAtSummaryTransformer.select(),
        comment: CommunityPlatformCommentTransformer.select(),
      },
    } satisfies Prisma.community_platform_report_comment_targetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReportCommentTarget> {
    return {
      id: input.id,
      report: await CommunityPlatformReportAtSummaryTransformer.transform(
        input.report,
      ),
      comment: await CommunityPlatformCommentTransformer.transform(
        input.comment,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformReportCommentTargetTransformer {
//       export type Payload = Prisma.community_platform_report_comment_targetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             report: CommunityPlatformReportAtSummaryTransformer.select(),
//             comment: CommunityPlatformCommentTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_report_comment_targetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformReportCommentTarget> {
//         return {
//   id: {string},
//   report: await CommunityPlatformReportAtSummaryTransformer.transform(input.report),
//   comment: await CommunityPlatformCommentTransformer.transform(input.comment),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------