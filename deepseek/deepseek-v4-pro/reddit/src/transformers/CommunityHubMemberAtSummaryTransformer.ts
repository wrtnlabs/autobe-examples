import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityHubMemberAtSummaryTransformer {
  export type Payload = Prisma.community_hub_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_uri: true,
        karma: true,
        created_at: true,
      },
    } satisfies Prisma.community_hub_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubMember.ISummary> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name,
      avatar_uri: input.avatar_uri ?? null,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
    } satisfies ICommunityHubMember.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubMemberAtSummaryTransformer {
//       export type Payload = Prisma.community_hub_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             username: true,
//             email: true,
//             password_hash: true,
//             display_name: true,
//             bio: true,
//             avatar_uri: true,
//             karma: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.community_hub_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubMember.ISummary> {
//         return {
//   id: {string},
//   username: {string},
//   display_name: {string},
//   avatar_uri: {string | null},
//   karma: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------