import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneFileAssociationAtSummaryTransformer } from "./RedditCloneFileAssociationAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneUserProfileTransformer {
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
        member: RedditCloneMemberAtSummaryTransformer.select(),
        avatarFileAssociation:
          RedditCloneFileAssociationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneUserProfile> {
    return {
      id: input.id,
      displayName: input.display_name,
      bio: input.bio,
      avatar: input.avatarFileAssociation
        ? await RedditCloneFileAssociationAtSummaryTransformer.transform(
            input.avatarFileAssociation,
          )
        : null,
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IRedditCloneUserProfile;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneUserProfileTransformer {
//       export type Payload = Prisma.reddit_clone_user_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             display_name: true,
//             bio: true,
//             created_at: true,
//             updated_at: true,
//             member: RedditCloneMemberAtSummaryTransformer.select(),
//             avatarFileAssociation: RedditCloneFileAssociationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_user_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneUserProfile> {
//         return {
//   id: {string},
//   displayName: {string},
//   bio: {string | null},
//   avatar: input.avatarFileAssociation ? await RedditCloneFileAssociationAtSummaryTransformer.transform(input.avatarFileAssociation) : null,
//   member: await RedditCloneMemberAtSummaryTransformer.transform(input.member),
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------