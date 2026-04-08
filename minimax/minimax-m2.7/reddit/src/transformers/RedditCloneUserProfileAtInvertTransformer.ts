import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
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
            email: true,
            username: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            karma: {
              select: {
                karma_score: true,
              },
            },
            posts: {
              select: {
                id: true,
                title: true,
                type: true,
                vote_score: true,
                comment_count: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            comments: {
              select: {
                id: true,
                content: true,
                vote_score: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        avatarFileAssociation: {
          select: {
            file: {
              select: {
                id: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                storage_path: true,
                original_filename: true,
                stored_filename: true,
                mime_type: true,
                file_size: true,
              },
            },
          },
        },
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneUserProfile.IInvert> {
    const avatar = input.avatarFileAssociation?.file ?? null;
    return {
      displayName: input.display_name,
      bio: input.bio ?? undefined,
      avatar: avatar
        ? typia.assert<IRedditCloneFile.ISummary>({
            id: avatar.id,
            status: avatar.status,
          })
        : null,
      member: typia.assert<IRedditCloneMember.ISummary>({
        id: input.member.id,
        username: input.member.username,
      }),
      karmaScore: input.member.karma?.karma_score ?? 0,
      posts: input.member.posts.map((post) =>
        typia.assert<IRedditClonePost.ISummary>({
          id: post.id,
          title: post.title,
          type: post.type,
          voteScore: post.vote_score,
          commentCount: post.comment_count,
        }),
      ),
      comments: input.member.comments.map((comment) =>
        typia.assert<IRedditCloneComment.ISummary>({
          id: comment.id,
          content: comment.content,
          voteScore: comment.vote_score,
        }),
      ),
    };
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