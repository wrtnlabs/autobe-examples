import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorPostsPostIdCommentsSorted(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  // 1. Verify moderator permission via post's community
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_id: true,
      },
    },
  );
  const moderatorPermission =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: post.community_id,
        user_id: props.moderator.id,
        is_active: true,
      },
      select: { id: true },
    });
  if (!moderatorPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Build where clause
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "best";
  const parentCommentId = props.body.parent_comment_id;
  const whereInput = {
    community_platform_post_id: props.postId,
    is_deleted: false,
    deleted_at: null,
    ...(parentCommentId !== undefined && {
      parent_comment_id: parentCommentId,
    }),
  } satisfies Prisma.community_platform_commentsWhereInput;
  // 3. Determine ordering based on sort algorithm
  let orderByInput: Prisma.community_platform_commentsOrderByWithRelationInput;
  switch (sort) {
    case "new":
      orderByInput = { created_at: "desc" as const };
      break;
    case "best":
      // Use score from voteScore relation
      orderByInput = { voteScore: { score: "desc" as const } };
      break;
    case "controversial":
      // Order by total engagement (up+down) then by score near zero
      orderByInput = {
        voteScore: {
          upvote_count: "desc" as const,
        },
      };
      break;
    default:
      orderByInput = { created_at: "desc" as const };
  }
  // 4. Query with transformer select plus voteScore inclusion
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: whereInput,
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          karma: true,
          created_at: true,
        } satisfies Prisma.community_platform_usersFindManyArgs,
      },
      post: {
        select: {
          id: true,
          title: true,
          post_type: true,
          author: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
              karma: true,
              created_at: true,
            } satisfies Prisma.community_platform_usersFindManyArgs,
          },
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              icon_url: true,
              owner: {
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  avatar_url: true,
                  karma: true,
                  created_at: true,
                } satisfies Prisma.community_platform_usersFindManyArgs,
              },
              created_at: true,
            } satisfies Prisma.community_platform_communitiesFindManyArgs,
          },
          created_at: true,
        } satisfies Prisma.community_platform_postsFindManyArgs,
      },
      voteScore: {
        select: {
          upvote_count: true,
          downvote_count: true,
          score: true,
        } satisfies Prisma.community_platform_comment_vote_scoresFindManyArgs,
      },
    },
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  // 5. Get total count
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where: whereInput,
  });
  // 6. Transform each comment
  const data: ICommunityPlatformComment.ISummary[] = await Promise.all(
    comments.map(async (comment) => {
      const voteScoreValue = comment.voteScore?.score ?? 0;
      return {
        id: comment.id,
        content: comment.content as string & tags.MaxLength<200>,
        author: {
          id: comment.author.id,
          username: comment.author.username,
          display_name: comment.author.display_name,
          avatar_url: comment.author.avatar_url,
          karma: comment.author.karma,
          created_at: comment.author.created_at.toISOString(),
        } satisfies ICommunityPlatformUser.ISummary,
        post: {
          id: comment.post.id,
          title: comment.post.title,
          post_type: comment.post.post_type,
          author: {
            id: comment.post.author.id,
            username: comment.post.author.username,
            display_name: comment.post.author.display_name,
            avatar_url: comment.post.author.avatar_url,
            karma: comment.post.author.karma,
            created_at: comment.post.author.created_at.toISOString(),
          } satisfies ICommunityPlatformUser.ISummary,
          community: {
            id: comment.post.community.id,
            name: comment.post.community.name,
            description: comment.post.community.description,
            icon_url: comment.post.community.icon_url,
            owner: {
              id: comment.post.community.owner.id,
              username: comment.post.community.owner.username,
              display_name: comment.post.community.owner.display_name,
              avatar_url: comment.post.community.owner.avatar_url,
              karma: comment.post.community.owner.karma,
              created_at: comment.post.community.owner.created_at.toISOString(),
            } satisfies ICommunityPlatformUser.ISummary,
            created_at: comment.post.community.created_at.toISOString(),
          } satisfies ICommunityPlatformCommunity.ISummary,
          created_at: comment.post.created_at.toISOString(),
        } satisfies ICommunityPlatformPost.ISummary,
        vote_score: voteScoreValue as number & tags.Type<"int32">,
        created_at: comment.created_at.toISOString(),
        updated_at: comment.updated_at?.toISOString() ?? null,
      } satisfies ICommunityPlatformComment.ISummary;
    }),
  );
  // 7. Return paginated result
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
