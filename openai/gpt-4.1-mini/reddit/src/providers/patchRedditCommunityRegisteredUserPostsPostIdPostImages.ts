import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { IPageIRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function patchRedditCommunityRegisteredUserPostsPostIdPostImages(props: {
  registeredUser: RegisteredUserPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostImage.IRequest;
}): Promise<IPageIRedditCommunityPostImage.ISummary> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, reddit_registered_user_id: true },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.reddit_registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const take = limit > 100 ? 100 : limit;
  const skip = (page - 1) * take;

  const whereCondition = {
    reddit_community_post_id: props.postId,
    ...(props.body.filterMimeType
      ? { mime_type: props.body.filterMimeType }
      : {}),
  };

  const orderByCondition: Partial<
    Record<
      "created_at" | "updated_at" | "mime_type" | "position",
      "asc" | "desc"
    >
  > = {};

  switch (props.body.sortBy) {
    case "createdAt":
      orderByCondition.created_at = props.body.order ?? "desc";
      break;
    case "updatedAt":
      orderByCondition.updated_at = props.body.order ?? "desc";
      break;
    case "mimeType":
      orderByCondition.mime_type = props.body.order ?? "desc";
      break;
    case "position":
      orderByCondition.position = props.body.order ?? "desc";
      break;
    default:
      orderByCondition.created_at = "desc";
      break;
  }

  const [images, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_post_images.findMany({
      where: whereCondition,
      skip,
      take,
      orderBy: orderByCondition,
      select: {
        id: true,
        reddit_community_post_id: true,
        url: true,
        mime_type: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_post_images.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data: images.map((image) => ({
      id: image.id,
      post_id: image.reddit_community_post_id,
      url: image.url,
      width: 0,
      height: 0,
      order: 0,
    })),
  };
}
