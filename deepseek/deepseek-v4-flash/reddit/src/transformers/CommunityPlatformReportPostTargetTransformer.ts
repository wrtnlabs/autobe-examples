import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformReportAtSummaryTransformer } from "./CommunityPlatformReportAtSummaryTransformer";

export namespace CommunityPlatformReportPostTargetTransformer {
  export type Payload = Prisma.community_platform_report_post_targetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report: CommunityPlatformReportAtSummaryTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_report_post_targetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReportPostTarget> {
    return {
      id: input.id,
      report: await CommunityPlatformReportAtSummaryTransformer.transform(
        input.report,
      ),
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies ICommunityPlatformReportPostTarget;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformReportPostTargetTransformer {
//       export type Payload = Prisma.community_platform_report_post_targetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             report: CommunityPlatformReportAtSummaryTransformer.select(),
//             post: CommunityPlatformPostAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_report_post_targetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformReportPostTarget> {
//         return {
//   id: {string},
//   report: await CommunityPlatformReportAtSummaryTransformer.transform(input.report),
//   post: await CommunityPlatformPostAtSummaryTransformer.transform(input.post),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------