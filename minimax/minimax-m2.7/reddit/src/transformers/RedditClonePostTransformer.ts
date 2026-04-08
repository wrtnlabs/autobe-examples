import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditClonePostImageTransformer } from "./RedditClonePostImageTransformer";
import { RedditClonePostLinkTransformer } from "./RedditClonePostLinkTransformer";
import { RedditClonePostTextContentTransformer } from "./RedditClonePostTextContentTransformer";

export namespace RedditClonePostTransformer {
  export type Payload = Prisma.reddit_clone_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        type: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditCloneMemberAtSummaryTransformer.select(),
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        postTextContent: RedditClonePostTextContentTransformer.select(),
        link: RedditClonePostLinkTransformer.select(),
        image: RedditClonePostImageTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditClonePost> {
    return {
      id: input.id,
      title: input.title,
      type: input.type,
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      textContent: await RedditClonePostTextContentTransformer.transform(
        input.postTextContent,
      ),
      link: await RedditClonePostLinkTransformer.transform(input.link),
      image: await RedditClonePostImageTransformer.transform(input.image),
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at !== null && input.deleted_at !== undefined
          ? toISOStringSafe(input.deleted_at)
          : null,
    } satisfies IRedditClonePost;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditClonePostTransformer {
//       export type Payload = Prisma.reddit_clone_postsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             type: true,
//             vote_score: true,
//             comment_count: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             author: RedditCloneMemberAtSummaryTransformer.select(),
//             community: RedditCloneCommunityAtSummaryTransformer.select(),
//             link: RedditClonePostLinkTransformer.select(),
//             postTextContent: RedditClonePostTextContentTransformer.select(),
//             image: RedditClonePostImageTransformer.select(),
//           },
//         } satisfies Prisma.reddit_clone_postsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditClonePost> {
//         return {
//   id: {string},
//   title: {string},
//   type: {string},
//   author: await RedditCloneMemberAtSummaryTransformer.transform(input.author),
//   community: await RedditCloneCommunityAtSummaryTransformer.transform(input.community),
//   textContent: await RedditClonePostTextContentTransformer.transform(input.postTextContent),
//   link: await RedditClonePostLinkTransformer.transform(input.link),
//   image: await RedditClonePostImageTransformer.transform(input.image),
//   voteScore: {integer},
//   commentCount: {integer},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------