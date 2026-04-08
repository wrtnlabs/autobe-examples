import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneFileAtSummaryTransformer } from "./RedditCloneFileAtSummaryTransformer";

export namespace RedditCloneCommunityIconAtInvertTransformer {
  export type Payload = Prisma.reddit_clone_community_iconsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        file: RedditCloneFileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_community_iconsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityIcon.IInvert> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      file: await RedditCloneFileAtSummaryTransformer.transform(input.file),
    } satisfies IRedditCloneCommunityIcon.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneCommunityIconAtInvertTransformer {
//       export type Payload = Prisma.reddit_clone_community_iconsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             community: RedditCloneCommunityAtSummaryTransformer.select(),
//             file: RedditCloneFileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_community_iconsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneCommunityIcon.IInvert> {
//         return {
//   id: {string},
//   createdAt: {string},
//   community: await RedditCloneCommunityAtSummaryTransformer.transform(input.community),
//   file: await RedditCloneFileAtSummaryTransformer.transform(input.file),
//         };
//       }
//     }
//--------------------------------------------------------------