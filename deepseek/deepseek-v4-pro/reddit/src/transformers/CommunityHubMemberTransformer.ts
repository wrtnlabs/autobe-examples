import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityHubCommentTransformer } from "./CommunityHubCommentTransformer";
import { CommunityHubPostAtSummaryTransformer } from "./CommunityHubPostAtSummaryTransformer";

export namespace CommunityHubMemberTransformer {
  export type Payload = Prisma.community_hub_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_uri: true,
        karma: true,
        created_at: true,
        posts: CommunityHubPostAtSummaryTransformer.select(),
        comments: CommunityHubCommentTransformer.select(),
      },
    } satisfies Prisma.community_hub_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityHubMember> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name,
      bio: input.bio ?? null,
      avatar_uri: input.avatar_uri ?? null,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
      posts: await ArrayUtil.asyncMap(
        input.posts,
        CommunityHubPostAtSummaryTransformer.transform,
      ),
      comments: await ArrayUtil.asyncMap(
        input.comments,
        CommunityHubCommentTransformer.transform,
      ),
    } satisfies ICommunityHubMember;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace CommunityHubMemberTransformer {
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
//             posts: CommunityHubPostAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.community_hub_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<ICommunityHubMember> {
//         return {
//   id: {string},
//   username: {string},
//   display_name: {string},
//   bio: {string | null},
//   avatar_uri: {string | null},
//   karma: {integer},
//   created_at: {string},
//   posts: await ArrayUtil.asyncMap(input.posts, CommunityHubPostAtSummaryTransformer.transform),
//   comments: {Array<ICommunityHubComment>},
//         };
//       }
//     }
//--------------------------------------------------------------