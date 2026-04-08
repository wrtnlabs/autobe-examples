import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneUserProfileAtInvertTransformer {
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
        member: {
          select: {
            id: true,
            username: true,
            posts: {
              select: {
                id: true,
                title: true,
                type: true,
                vote_score: true,
                comment_count: true,
                created_at: true,
                community: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    subscriber_count: true,
                  },
                },
              },
            },
            comments: {
              select: {
                id: true,
                content: true,
                vote_score: true,
                created_at: true,
                member: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
        },
        avatarFileAssociation: {
          select: {
            file: {
              select: {
                id: true,
                created_at: true,
                file_size: true,
                mime_type: true,
                original_filename: true,
                status: true,
                uploader: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
                thumbnails: {
                  select: {
                    id: true,
                    width: true,
                    height: true,
                    variant: true,
                    thumbnail_path: true,
                    created_at: true,
                  },
                },
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_clone_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneUserProfile.IInvert> {
    const karmaScore =
      input.member.posts.reduce((sum, p) => sum + p.vote_score, 0) +
      input.member.comments.reduce((sum, c) => sum + c.vote_score, 0);
    return {
      displayName: input.display_name,
      bio: input.bio ?? undefined,
      avatar: input.avatarFileAssociation?.file
        ? typia.assert<IRedditCloneFile.ISummary>({
            id: input.avatarFileAssociation.file.id,
            createdAt: toISOStringSafe(
              input.avatarFileAssociation.file.created_at,
            ),
            fileSize: input.avatarFileAssociation.file.file_size,
            mimeType: input.avatarFileAssociation.file.mime_type,
            originalFilename:
              input.avatarFileAssociation.file.original_filename,
            status: input.avatarFileAssociation.file.status,
            uploader: {
              id: input.avatarFileAssociation.file.uploader.id,
              username: input.avatarFileAssociation.file.uploader.username,
            },
            thumbnails: input.avatarFileAssociation.file.thumbnails?.map(
              (t) => ({
                id: t.id,
                width: t.width,
                height: t.height,
                variant: t.variant,
                thumbnailPath: t.thumbnail_path,
                createdAt: toISOStringSafe(t.created_at),
                items: typia.assert<IRedditCloneFile.ISummary[]>([]),
              }),
            ),
          })
        : null,
      member: {
        id: input.member.id,
        username: input.member.username,
      },
      karmaScore,
      posts: input.member.posts.map((p) => ({
        id: p.id,
        title: p.title,
        type: p.type as "text" | "link" | "image",
        voteScore: p.vote_score,
        commentCount: p.comment_count,
        createdAt: toISOStringSafe(p.created_at),
        community: {
          id: p.community.id,
          name: p.community.name,
          description: p.community.description,
          subscriberCount: p.community.subscriber_count,
          owner: {
            id: input.member.id,
            username: input.member.username,
          },
        },
        contentPreview: "",
        author: {
          id: input.member.id,
          username: input.member.username,
        },
      })),
      comments: input.member.comments.map((c) => ({
        id: c.id,
        content: c.content,
        voteScore: c.vote_score,
        createdAt: toISOStringSafe(c.created_at),
        author: {
          id: c.member.id,
          username: c.member.username,
        },
        replies: [],
      })),
    } satisfies IRedditCloneUserProfile.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace RedditCloneUserProfileAtInvertTransformer {
//       export type Payload = Prisma.reddit_clone_user_profilesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             displayName: true,
//             bio: true,
//             karmaScore: true,
//             ...
//           },
//         } satisfies Prisma.reddit_clone_user_profilesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IRedditCloneUserProfile.IInvert> {
//         return {
//   displayName: {string},
//   bio: {string | null},
//   avatar: {IRedditCloneFile.ISummary | null},
//   member: {IRedditCloneMember.ISummary},
//   karmaScore: {integer},
//   posts: {Array<IRedditClonePost.ISummary>},
//   comments: {Array<IRedditCloneComment.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------