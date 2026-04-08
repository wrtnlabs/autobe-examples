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

export namespace RedditCloneFileAssociationAtResponseTransformer {
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
      },
    } satisfies Prisma.reddit_clone_file_associationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFileAssociation.IResponse> {
    return {
      id: input.id,
      targetType: input.target_type,
      targetId: input.target_id,
      file: await RedditCloneFileAtSummaryTransformer.transform(input.file),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IRedditCloneFileAssociation.IResponse;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneFileAssociationAtResponseTransformer {
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
//       export async function transform(input: Payload): Promise<IRedditCloneFileAssociation.IResponse> {
//         return {
//   id: {string},
//   targetType: {string},
//   targetId: {string},
//   file: await RedditCloneFileAtSummaryTransformer.transform(input.file),
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------