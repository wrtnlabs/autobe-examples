import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putRedditCommunityMemberCommunitiesCommunityIdPostsPostId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPosts.IUpdate;
}): Promise<IRedditCommunityPosts> {
  const { member, communityId, postId, body } = props;

  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new HttpException("Post not found", 404);

  if (post.reddit_community_community_id !== communityId) {
    throw new HttpException(
      "Post does not belong to the specified community",
      404,
    );
  }

  if (post.author_member_id !== member.id) {
    const moderator =
      await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
        where: { member_id: member.id, community_id: communityId },
      });
    if (!moderator) {
      throw new HttpException("Forbidden: Not author or moderator", 403);
    }
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: postId },
    data: {
      title: body.title ?? undefined,
      body_text: body.body_text ?? undefined,
      link_url: body.link_url ?? undefined,
      image_url: body.image_url ?? undefined,
      status: body.status ?? undefined,
      business_status: body.business_status ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    author_member_id:
      updated.author_member_id === null ? undefined : updated.author_member_id,
    author_guest_id:
      updated.author_guest_id === null ? undefined : updated.author_guest_id,
    reddit_community_community_id: updated.reddit_community_community_id,
    post_type: updated.post_type,
    title: updated.title,
    body_text: updated.body_text ?? null,
    link_url: updated.link_url ?? null,
    image_url: updated.image_url ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    status: updated.status ?? null,
    business_status: updated.business_status ?? null,
  };
}
