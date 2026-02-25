import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string;
  body: IRedditCloneContentPost.IUpdate;
}): Promise<IRedditCloneContentPost> {
  const post =
    await MyGlobal.prisma.reddit_clone_content_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        title: true,
        content: true,
        image_url: true,
        type: true,
        author_id: true,
        updated_at: true,
        created_at: true,
        vote_score: true,
        comment_count: true,
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            created_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
              },
            },
          },
        },
      },
    });
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: Prisma.reddit_clone_content_postsUpdateInput = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.content !== undefined && { content: props.body.content }),
    ...(props.body.url !== undefined && { content: props.body.url }),
    ...(props.body.imageUrl !== undefined && {
      image_url: props.body.imageUrl,
    }),
  };
  const updatedPost = await MyGlobal.prisma.reddit_clone_content_posts.update({
    where: { id: props.postId },
    data: updateData,
    select: {
      id: true,
      title: true,
      content: true,
      image_url: true,
      type: true,
      author_id: true,
      updated_at: true,
      created_at: true,
      vote_score: true,
      comment_count: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          subscriber_count: true,
          created_at: true,
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
      },
    },
  });
  const createdAtStr = updatedPost.created_at.toISOString();
  const updatedAtStr = updatedPost.updated_at.toISOString();
  return {
    id: updatedPost.id,
    title: updatedPost.title,
    author: {
      id: updatedPost.author.id,
      username: updatedPost.author.username,
      displayName: updatedPost.author.display_name,
      avatarUrl: updatedPost.author.avatar_url,
    } satisfies IRedditCloneMember.ISummary,
    community: {
      id: updatedPost.community.id,
      name: updatedPost.community.name,
      description: updatedPost.community.description,
      iconUrl: updatedPost.community.icon_url,
      subscriberCount: updatedPost.community.subscriber_count,
      createdAt: createdAtStr,
      owner: {
        id: updatedPost.community.owner.id,
        username: updatedPost.community.owner.username,
        displayName: updatedPost.community.owner.display_name,
        avatarUrl: updatedPost.community.owner.avatar_url,
      } satisfies IRedditCloneOwner.ISummary,
    } satisfies IRedditCloneCommunity.ISummary,
    vote_score: updatedPost.vote_score,
    comment_count: updatedPost.comment_count,
    created_at: createdAtStr,
  };
}
