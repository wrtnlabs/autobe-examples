import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { IPageICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserPostsPostIdAttachments(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostAttachment.IRequest;
}): Promise<IPageICommunityPlatformPostAttachment.ISummary> {
  // 1. Load the parent post with given postId
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      user_id: true,
      deleted_at: true,
    },
  });

  if (!post) {
    throw new HttpException("Post not found.", 404);
  }

  // 2. Check post visibility for requesting user
  // Post is visible if not soft-deleted (deleted_at is null), or if user is the owner (post.user_id === props.user.id)
  const canSeeDeleted = post.user_id === props.user.id;
  if (post.deleted_at && !canSeeDeleted) {
    throw new HttpException("Post is not available.", 403);
  }

  // 3. Pagination and sorting
  const page = props.body.page;
  const limit = props.body.limit;

  // Sorting (allow 'created_at' only, 'desc' default)
  const sortBy =
    props.body.sort_by === "created_at" ? "created_at" : "created_at";
  const order: "asc" | "desc" = props.body.order === "asc" ? "asc" : "desc";
  const skip = (page - 1) * limit;

  // 4. Query total
  const total = await MyGlobal.prisma.community_platform_post_attachments.count(
    {
      where: { post_id: props.postId },
    },
  );

  // 5. Query for paged attachments ordered
  const attachments =
    await MyGlobal.prisma.community_platform_post_attachments.findMany({
      where: { post_id: props.postId },
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    });

  // 6. Build attachment summary array (convert date)
  const summaries = attachments.map((a) => ({
    id: a.id,
    uri: a.uri,
    mimetype: a.mimetype,
    created_at: toISOStringSafe(a.created_at),
  }));

  // 7. Compute pages
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: summaries,
  };
}
