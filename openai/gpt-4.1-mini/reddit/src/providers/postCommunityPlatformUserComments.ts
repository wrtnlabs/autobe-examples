import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentCollector } from "../collectors/CommunityPlatformCommentCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserComments(props: {
  user: UserPayload;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  // Validate content is non-empty
  if (!props.body.content || props.body.content.trim().length === 0) {
    throw new HttpException("Content must not be empty", 400);
  }
  // Check post existence
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.body.postId },
    select: { id: true },
  });
  // If parentId provided, validate it exists and belongs to the same post
  if (props.body.parentId) {
    const parent = await MyGlobal.prisma.community_platform_comments.findUnique(
      {
        where: { id: props.body.parentId },
        select: { post_id: true },
      },
    );
    if (!parent) {
      throw new HttpException("Parent comment not found", 400);
    }
    if (parent.post_id !== props.body.postId) {
      throw new HttpException(
        "Parent comment belongs to a different post",
        400,
      );
    }
  }
  // Use collector to collect create input
  const data = await CommunityPlatformCommentCollector.collect({
    body: props.body,
    user: props.user,
  });
  // Create the comment
  const created = await MyGlobal.prisma.community_platform_comments.create({
    data,
    ...CommunityPlatformCommentTransformer.select(),
  });
  // Transform the created comment to response DTO
  return await CommunityPlatformCommentTransformer.transform(created);
}
