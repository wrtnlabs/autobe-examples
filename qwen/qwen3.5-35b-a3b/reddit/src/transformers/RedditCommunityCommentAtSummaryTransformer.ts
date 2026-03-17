import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.reddit_community_commentsFindManyArgs {
    return {
      select: {
        id: true,
        created_at: true,
        parent: {
          select: {
            id: true,
            created_at: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
        author: {
          select: {
            id: true,
            username: true,
            created_at: true,
            karma: {
              select: {
                current_score: true,
              },
            },
            userAvatarFiles: {
              select: {
                id: true,
                userProfiles: {
                  select: {
                    id: true,
                    display_name: true,
                    bio: true,
                    created_at: true,
                    karma: {
                      select: {
                        current_score: true,
                      },
                    },
                    avatar_image_url_id: true,
                  },
                },
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_community_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityComment.ISummary> {
    const parentComment = input.parent
      ? await transform({
          id: input.parent.id,
          created_at: input.parent.created_at,
        } as any)
      : null;
    return {
      id: input.id,
      voteScore: 0,
      createdAt: toISOStringSafe(input.created_at),
      parentComment,
      replyCount: input._count.replies,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
    } satisfies IRedditCommunityComment.ISummary;
  }
}
