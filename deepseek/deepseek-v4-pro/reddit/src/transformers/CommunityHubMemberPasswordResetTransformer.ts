import { ICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityHubMemberPasswordResetTransformer {
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
      },
    } satisfies Prisma.community_hub_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubMemberPasswordReset> {
    return {
      id: input.id,
      token: input.token,
      expired_at: input.expired_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies ICommunityHubMemberPasswordReset;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubMemberPasswordResetTransformer {
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
//       export async function transform(input: Payload): Promise<ICommunityHubMemberPasswordReset> {
//         return {
//   id: {string},
//   token: {string},
//   expired_at: {string},
//   used_at: {string | null},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------