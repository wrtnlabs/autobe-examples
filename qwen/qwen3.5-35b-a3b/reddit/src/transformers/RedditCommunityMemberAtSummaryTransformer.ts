import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.reddit_community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMember.ISummary> {
    return {
      id: input.id,
      username: input.username,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IRedditCommunityMember.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityMemberAtSummaryTransformer {
//       export type Payload = Prisma.reddit_community_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             username: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.reddit_community_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCommunityMember.ISummary> {
//         return {
//   id: {string},
//   username: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------