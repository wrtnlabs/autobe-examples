import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityHubMemberAtSummaryTransformer } from "./CommunityHubMemberAtSummaryTransformer";

export namespace CommunityHubReportAtSummaryTransformer {
  export type Payload = Prisma.community_hub_reportsGetPayload<
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
        deleted_at: true,
        reporter: CommunityHubMemberAtSummaryTransformer.select(),
        community: true,
      },
    } satisfies Prisma.community_hub_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubReport.ISummary> {
    return {
      id: input.id,
      reporter: await CommunityHubMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason,
      status: input.status,
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityHubReport.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubReportAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_reportsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             target_type: true,
//             target_id: true,
//             reason: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reporter: CommunityHubMemberAtSummaryTransformer.select(),
//             community_hub_community_id: true,
//           },
//         } satisfies Prisma.community_hub_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubReport.ISummary> {
//         return {
//   id: {string},
//   reporter: await CommunityHubMemberAtSummaryTransformer.transform(input.reporter),
//   target_type: {string},
//   target_id: {string},
//   reason: {string},
//   status: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------