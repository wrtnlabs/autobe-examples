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
import { RedditCloneFileAtSummaryTransformer } from "./RedditCloneFileAtSummaryTransformer";

export namespace RedditCloneFileAssociationAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_file_associationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        target_id: true,
        created_at: true,
        updated_at: true,
        file: RedditCloneFileAtSummaryTransformer.select(),
        userProfileAvatar: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_user_profilesFindFirstArgs,
      },
    } satisfies Prisma.reddit_clone_file_associationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFileAssociation.ISummary> {
    return {
      id: input.id,
      userId: input.target_id,
      file: await RedditCloneFileAtSummaryTransformer.transform(input.file),
      createdAt: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneFileAssociationAtSummaryTransformer {
//       export type Payload = Prisma.reddit_clone_file_associationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             target_type: true,
//             target_id: true,
//             created_at: true,
//             updated_at: true,
//             file: RedditCloneFileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_file_associationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneFileAssociation.ISummary> {
//         return {
//   id: {string},
//   userId: {string},
//   file: await RedditCloneFileAtSummaryTransformer.transform(input.file),
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------