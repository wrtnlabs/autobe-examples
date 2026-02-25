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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdCommentsHierarchy(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformComment> {
  // Verify post exists
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Get all comments for this post (no pagination for hierarchy - return all)
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: {
      community_platform_post_id: props.postId,
      is_deleted: false,
    },
    ...CommunityPlatformCommentTransformer.select(),
  });
  // Transform all comments
  const data = await Promise.all(
    comments.map((comment) =>
      CommunityPlatformCommentTransformer.transform(comment),
    ),
  );
  // For hierarchy endpoint, return all comments with pagination showing all records
  return {
    data,
    pagination: {
      current: 1,
      limit: data.length,
      records: data.length,
      pages: 1,
    } satisfies IPage.IPagination,
  };
}
