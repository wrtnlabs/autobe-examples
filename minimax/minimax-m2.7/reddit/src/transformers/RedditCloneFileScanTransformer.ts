import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneFileAtSummaryTransformer } from "./RedditCloneFileAtSummaryTransformer";

export namespace RedditCloneFileScanTransformer {
  // 1. Payload type first (inferred from select)
  export type Payload = Prisma.reddit_clone_file_scansGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        scanned_at: true,
        scanner: true,
        status: true,
        threat_name: true,
        details: true,
        created_at: true,
        updated_at: true,
        file: RedditCloneFileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_file_scansFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFileScan> {
    return {
      id: input.id,
      scannedAt: input.scanned_at.toISOString(),
      scanner: input.scanner,
      status: input.status,
      threatName: input.threat_name ?? undefined,
      details: input.details ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      file: await RedditCloneFileAtSummaryTransformer.transform(input.file),
    } satisfies IRedditCloneFileScan;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneFileScanTransformer {
//       export type Payload = Prisma.reddit_clone_file_scansGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             scanned_at: true,
//             scanner: true,
//             status: true,
//             threat_name: true,
//             details: true,
//             created_at: true,
//             updated_at: true,
//             file: RedditCloneFileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_file_scansFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneFileScan> {
//         return {
//   id: {string},
//   scannedAt: {string},
//   scanner: {string},
//   status: {string},
//   threatName: {string | null},
//   details: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   file: await RedditCloneFileAtSummaryTransformer.transform(input.file),
//         };
//       }
//     }
//--------------------------------------------------------------