import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformUserPostsPostIdComments(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  // 1. Validate post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: {
        id: props.postId,
        deleted_at: null,
      },
    },
  );
  // 2. Validate parent comment if provided
  if (
    props.body.parent_comment_id !== undefined &&
    props.body.parent_comment_id !== null
  ) {
    const parentComment =
      await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
        where: {
          id: props.body.parent_comment_id,
          community_platform_post_id: props.postId,
          is_deleted: false,
        },
      });
  }
  // 3. Collect data for comment creation
  const data = await CommunityPlatformCommentCollector.collect({
    body: props.body,
    author: { id: props.user.id },
    post: { id: props.postId },
  });
  // 4. Create comment with transformer select for complete response
  const created = await MyGlobal.prisma.community_platform_comments.create({
    data: data,
    ...CommunityPlatformCommentTransformer.select(),
  });
  // 5. Transform to response DTO
  return await CommunityPlatformCommentTransformer.transform(created);
}
