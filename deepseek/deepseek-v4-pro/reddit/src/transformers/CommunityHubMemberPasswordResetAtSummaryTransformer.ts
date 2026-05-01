import { ICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityHubMemberPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.community_hub_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expired_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        member: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.community_hub_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubMemberPasswordReset.ISummary> {
    return {
      id: input.id,
      expired_at: input.expired_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityHubMemberPasswordReset.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubMemberPasswordResetAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_member_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             expired_at: true,
//             used_at: true,
//             created_at: true,
//             updated_at: true,
//             community_hub_member_id: true,
//           },
//         } satisfies Prisma.community_hub_member_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubMemberPasswordReset.ISummary> {
//         return {
//   id: {string},
//   expired_at: {string},
//   used_at: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------