import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityMemberTransformer {
  export type Payload = Prisma.reddit_community_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        session: true,
        passwordResetRequests: true,
        emailVerification: true,
        subscriptions: true,
        posts: true,
        postSnapshots: true,
        postVotes: true,
        comments: true,
        commentVotes: true,
        postReports: true,
        commentReports: true,
        moderatorRoles: true,
        banRecords: true,
        bansIssueds: true,
        reports: true,
      },
    } satisfies Prisma.reddit_community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMember> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditCommunityMember;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCommunityMemberTransformer {
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
//       export async function transform(input: Payload): Promise<IRedditCommunityMember> {
//         return {
//   id: {string},
//   email: {string},
//   username: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------