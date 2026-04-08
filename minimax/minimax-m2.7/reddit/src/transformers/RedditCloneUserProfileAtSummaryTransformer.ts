import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneFileAtSummaryTransformer } from "./RedditCloneFileAtSummaryTransformer";

export namespace RedditCloneUserProfileAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_user_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        created_at: true,
        updated_at: true,
        avatarFileAssociation: {
          select: {
            file: {
              select: RedditCloneFileAtSummaryTransformer.select().select,
            },
          },
        },
        member: {
          select: {
            id: true,
            username: true,
            created_at: true,
            updated_at: true,
            karma: {
              select: {
                karma_score: true,
              },
            },
          },
        },
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneUserProfile.ISummary> {
    return {
      id: input.id,
      displayName: input.display_name,
      bio: input.bio,
      createdAt: toISOStringSafe(input.created_at),
      avatar: input.avatarFileAssociation?.file
        ? await RedditCloneFileAtSummaryTransformer.transform(
            input.avatarFileAssociation.file,
          )
        : undefined,
      member: {
        id: input.member.id,
        username: input.member.username,
      },
      karmaScore: input.member.karma?.karma_score ?? 0,
    } satisfies IRedditCloneUserProfile.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneUserProfileAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_user_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             displayName: true,
//             bio: true,
//             createdAt: true,
//             karmaScore: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_user_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneUserProfile.ISummary> {
//         return {
//   id: {string},
//   displayName: {string},
//   bio: {string | null},
//   createdAt: {string},
//   avatar: {IRedditCloneFile.ISummary | null},
//   member: {IRedditCloneMember.ISummary},
//   karmaScore: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------