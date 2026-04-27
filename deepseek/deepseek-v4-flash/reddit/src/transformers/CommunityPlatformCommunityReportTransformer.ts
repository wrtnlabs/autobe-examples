import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformCommunityReportTransformer {
  export type Payload = Prisma.community_platform_community_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        reporter: CommunityPlatformMemberAtSummaryTransformer.select(),
        targetPost: CommunityPlatformPostAtSummaryTransformer.select(),
        targetComment: CommunityPlatformCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityReport> {
    return {
      id: input.id,
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      reporter: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      targetType: input.target_type,
      targetPost: input.targetPost
        ? await CommunityPlatformPostAtSummaryTransformer.transform(
            input.targetPost,
          )
        : null,
      targetComment: input.targetComment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.targetComment,
          )
        : null,
      reason: input.reason,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies ICommunityPlatformCommunityReport;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformCommunityReportTransformer {
//       export type Payload = Prisma.community_platform_community_reportsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             target_type: true,
//             reason: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             community: CommunityPlatformCommunityAtSummaryTransformer.select(),
//             reporter: CommunityPlatformMemberAtSummaryTransformer.select(),
//             targetPost: CommunityPlatformPostAtSummaryTransformer.select(),
//             targetComment: CommunityPlatformCommentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_community_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformCommunityReport> {
//         return {
//   id: {string},
//   community: await CommunityPlatformCommunityAtSummaryTransformer.transform(input.community),
//   reporter: await CommunityPlatformMemberAtSummaryTransformer.transform(input.reporter),
//   targetType: {string},
//   targetPost: input.targetPost ? await CommunityPlatformPostAtSummaryTransformer.transform(input.targetPost) : null,
//   targetComment: input.targetComment ? await CommunityPlatformCommentAtSummaryTransformer.transform(input.targetComment) : null,
//   reason: {string},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------