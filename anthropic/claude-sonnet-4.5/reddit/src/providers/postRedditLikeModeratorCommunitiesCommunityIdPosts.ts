import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditLikeModeratorCommunitiesCommunityIdPosts(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikePost.ICreate;
}): Promise<IRedditLikePost> {
  const { moderator, communityId, body } = props;

  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: communityId,
      deleted_at: null,
    },
  });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  if (community.is_archived) {
    throw new HttpException("Cannot post in archived community", 403);
  }

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  if (body.type === "text" && !community.allow_text_posts) {
    throw new HttpException(
      "Text posts are not allowed in this community",
      400,
    );
  }
  if (body.type === "link" && !community.allow_link_posts) {
    throw new HttpException(
      "Link posts are not allowed in this community",
      400,
    );
  }
  if (body.type === "image" && !community.allow_image_posts) {
    throw new HttpException(
      "Image posts are not allowed in this community",
      400,
    );
  }

  const moderatorRecord =
    await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
      where: { id: moderator.id },
    });

  const memberRecord = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      email: moderatorRecord.email,
      deleted_at: null,
    },
  });

  if (!memberRecord) {
    throw new HttpException(
      "Moderator does not have an associated member account",
      403,
    );
  }

  const postId = v4() as string & tags.Format<"uuid">;
  const contentId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const createdPost = await MyGlobal.prisma.reddit_like_posts.create({
    data: {
      id: postId,
      reddit_like_member_id: memberRecord.id,
      reddit_like_community_id: communityId,
      type: body.type,
      title: body.title,
      created_at: now,
      updated_at: now,
    },
  });

  if (body.type === "text") {
    await MyGlobal.prisma.reddit_like_post_text_content.create({
      data: {
        id: contentId,
        reddit_like_post_id: postId,
        body: body.body ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  } else if (body.type === "link") {
    const urlObj = new URL(body.url ?? "");
    const domain = urlObj.hostname;

    await MyGlobal.prisma.reddit_like_post_link_content.create({
      data: {
        id: contentId,
        reddit_like_post_id: postId,
        url: body.url ?? "",
        domain: domain,
        created_at: now,
        updated_at: now,
      },
    });
  } else if (body.type === "image") {
    await MyGlobal.prisma.reddit_like_post_image_content.create({
      data: {
        id: contentId,
        reddit_like_post_id: postId,
        original_image_url: body.image_url ?? "",
        medium_image_url: body.image_url ?? "",
        thumbnail_image_url: body.image_url ?? "",
        image_width: 1920,
        image_height: 1080,
        file_size: 1048576,
        file_format: "JPEG",
        caption: body.caption ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  }

  return {
    id: createdPost.id as string & tags.Format<"uuid">,
    type: createdPost.type,
    title: createdPost.title,
    created_at: toISOStringSafe(createdPost.created_at),
    updated_at: toISOStringSafe(createdPost.updated_at),
  };
}
