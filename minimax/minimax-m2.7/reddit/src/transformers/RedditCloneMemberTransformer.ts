import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneFileAssociationAtSummaryTransformer } from "./RedditCloneFileAssociationAtSummaryTransformer";

export namespace RedditCloneMemberTransformer {
  export type Payload = Prisma.reddit_clone_membersGetPayload<
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
        profile: {
          select: {
            display_name: true,
            bio: true,
            avatarFileAssociation:
              RedditCloneFileAssociationAtSummaryTransformer.select(),
          },
        } satisfies Prisma.reddit_clone_user_profilesFindFirstArgs,
        karma: {
          select: {
            karma_score: true,
          },
        } satisfies Prisma.reddit_clone_user_karmasFindFirstArgs,
      },
    } satisfies Prisma.reddit_clone_membersFindFirstArgs;
  }
  export async function transform(input: Payload): Promise<IRedditCloneMember> {
    return {
      id: input.id,
      username: input.username,
      displayName: input.profile?.display_name ?? input.username,
      bio: input.profile?.bio ?? undefined,
      avatar: input.profile?.avatarFileAssociation
        ? await RedditCloneFileAssociationAtSummaryTransformer.transform(
            input.profile.avatarFileAssociation,
          )
        : null,
      karmaScore: input.karma?.karma_score ?? 0,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditCloneMember;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneMemberTransformer {
//       export type Payload = Prisma.reddit_clone_membersGetPayload<ReturnType<typeof select>>;
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
//             ...
//           },
//         } satisfies Prisma.reddit_clone_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneMember> {
//         return {
//   id: {string},
//   username: {string},
//   displayName: {string},
//   bio: {string | null},
//   avatar: {IRedditCloneFileAssociation.ISummary | null},
//   karmaScore: {integer},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------