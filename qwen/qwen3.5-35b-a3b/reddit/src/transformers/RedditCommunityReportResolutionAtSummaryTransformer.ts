import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityReportResolutionAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_report_resolutionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        resolution_type: true,
        status: true,
        resolution_notes: true,
        escalation_reason: true,
        transferred_to_admin_id: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: {
          select: {
            display_name: true,
          },
        },
        report: {
          select: {
            community: {
              select: {
                name: true,
              },
            },
            reporter: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_community_report_resolutionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityReportResolution.ISummary> {
    return {
      id: input.id,
      resolution_type:
        input.resolution_type as IRedditCommunityReportResolution.ISummary["resolution_type"],
      status:
        input.status as IRedditCommunityReportResolution.ISummary["status"],
      resolution_notes: input.resolution_notes ?? undefined,
      resolved_at: input.resolved_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      admin_name: input.admin.display_name ?? undefined,
      community_name: input.report.community?.name ?? undefined,
      reporter_name: input.report.reporter?.username ?? undefined,
    } satisfies IRedditCommunityReportResolution.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityReportResolutionAtSummaryTransformer {
//       export type Payload = Prisma.reddit_community_report_resolutionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             resolution_type: true,
//             status: true,
//             resolution_notes: true,
//             escalation_reason: true,
//             transferred_to_admin_id: true,
//             resolved_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             reddit_community_report_id: true,
//             reddit_community_admin_id: true,
//           },
//         } satisfies Prisma.reddit_community_report_resolutionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityReportResolution.ISummary> {
//         return {
//   admin_name: {string | null},
//   community_name: {string | null},
//   created_at: {string},
//   id: {string},
//   resolution_notes: {string | null},
//   resolution_type: {"resolved" | "dismissed" | "escalated" | "transferred"},
//   resolved_at: {string | null},
//   reporter_name: {string | null},
//   status: {"open" | "resolved" | "dismissed" | "escalated" | "transferred"},
//         };
//       }
//     }
//--------------------------------------------------------------