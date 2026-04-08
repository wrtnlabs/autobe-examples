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
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        author: {
          select: {
            id: true,
            username: true,
          },
        } satisfies Prisma.reddit_clone_membersFindManyArgs,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            subscriber_count: true,
            member: {
              select: {
                id: true,
                username: true,
              },
            } satisfies Prisma.reddit_clone_membersFindManyArgs,
          },
        } satisfies Prisma.reddit_clone_communitiesFindManyArgs,
        postTextContent: {
          select: {
            id: true,
            body: true,
          },
        } satisfies Prisma.reddit_clone_post_text_contentsFindManyArgs,
        link: {
          select: {
            id: true,
            url: true,
          },
        } satisfies Prisma.reddit_clone_post_linksFindManyArgs,
        image: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            file: {
              select: {
                id: true,
                original_filename: true,
                stored_filename: true,
                mime_type: true,
                file_size: true,
                storage_path: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                uploader: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
        } satisfies Prisma.reddit_clone_post_imagesFindManyArgs,
        comments: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
        postVotes: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_post_votesFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditClonePost> {
    // Transform author inline
    const authorSummary: IRedditCloneMember.ISummary = {
      id: input.author.id,
      username: input.author.username,
    };
    // Transform community inline
    const communitySummary: IRedditCloneCommunity.ISummary = {
      id: input.community.id,
      name: input.community.name,
      description: input.community.description,
      subscriberCount: input.community.subscriber_count,
      owner: {
        id: input.community.member.id,
        username: input.community.member.username,
      },
    };
    // Transform textContent inline
    const textContent: IRedditClonePostTextContent | null =
      input.postTextContent
        ? {
            id: input.postTextContent.id,
            body: input.postTextContent.body,
            post: {
              id: input.id,
              title: input.title,
              type: input.type as "text" | "link" | "image",
              voteScore: input.vote_score,
              commentCount: input.comment_count,
              createdAt: toISOStringSafe(input.created_at),
              author: authorSummary,
              community: communitySummary,
              contentPreview: (input.postTextContent.body ?? "").slice(0, 200),
            },
          }
        : {
            id: "",
            body: "",
            post: {
              id: input.id,
              title: input.title,
              type: input.type as "text" | "link" | "image",
              voteScore: input.vote_score,
              commentCount: input.comment_count,
              createdAt: toISOStringSafe(input.created_at),
              author: authorSummary,
              community: communitySummary,
              contentPreview: "",
            },
          };
    // Transform link inline
    const link: IRedditClonePostLink | null = input.link
      ? {
          id: input.link.id,
          url: input.link.url,
          created_at: toISOStringSafe(input.created_at),
          updated_at: toISOStringSafe(input.updated_at),
        }
      : {
          id: "",
          url: "" as string & tags.Format<"uri">,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        };
    // Transform image inline
    const image: IRedditClonePostImage | null = input.image
      ? {
          id: input.image.id,
          file: {
            id: input.image.file.id,
            originalFilename: input.image.file.original_filename,
            storedFilename: input.image.file.stored_filename,
            mimeType: input.image.file.mime_type,
            fileSize: input.image.file.file_size,
            storagePath: input.image.file.storage_path,
            status: input.image.file.status,
            createdAt: toISOStringSafe(input.image.file.created_at),
            updatedAt: toISOStringSafe(input.image.file.updated_at),
            deletedAt: input.image.file.deleted_at
              ? toISOStringSafe(input.image.file.deleted_at)
              : null,
            uploader: {
              id: input.image.file.uploader.id,
              username: input.image.file.uploader.username,
            },
            thumbnails: [],
            scans: [],
            associations: [],
          },
          created_at: toISOStringSafe(input.image.created_at),
          updated_at: toISOStringSafe(input.image.updated_at),
        }
      : {
          id: "",
          file: {
            id: "",
            originalFilename: "",
            storedFilename: "",
            mimeType: "",
            fileSize: 0,
            storagePath: "",
            status: "",
            createdAt: toISOStringSafe(new Date()),
            updatedAt: toISOStringSafe(new Date()),
            deletedAt: null,
            uploader: {
              id: "",
              username: "",
            },
            thumbnails: [],
            scans: [],
            associations: [],
          },
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        };
    return {
      id: input.id,
      title: input.title,
      type: input.type,
      author: authorSummary,
      community: communitySummary,
      textContent: textContent,
      link: link,
      image: image,
      voteScore: input.vote_score,
      commentCount: input.comment_count,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
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
//             postTextContent: RedditClonePostTextContentTransformer.select(),
//             link: RedditClonePostLinkTransformer.select(),
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