import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformProfileTransformer {
  export type Payload = Prisma.community_platform_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        biography: true,
        avatar_uri: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformProfile> {
    return {
      id: input.id,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      display_name: input.display_name,
      biography: input.biography,
      avatar_uri: input.avatar_uri,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies ICommunityPlatformProfile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityPlatformProfileTransformer {
//       export type Payload = Prisma.community_platform_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             display_name: true,
//             biography: true,
//             avatar_uri: true,
//             karma: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: CommunityPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.community_platform_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityPlatformProfile> {
//         return {
//   id: {string},
//   member: await CommunityPlatformMemberAtSummaryTransformer.transform(input.member),
//   display_name: {string},
//   biography: {string | null},
//   avatar_uri: {string | null},
//   karma: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------