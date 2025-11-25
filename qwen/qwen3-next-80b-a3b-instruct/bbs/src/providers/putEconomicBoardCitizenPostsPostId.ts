import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function putEconomicBoardCitizenPostsPostId(props: {
  citizen: CitizenPayload;
  postId: string;
  body: IEconomicBoardPost.IUpdate;
}): Promise<IEconomicBoardPost> {
  const post = await MyGlobal.prisma.economic_board_posts.findUnique({
    where: {
      id: props.postId,
      citizen_id: props.citizen.id,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found or not owned by citizen", 404);
  }

  // Check if within 24-hour editing window
  const twentyFourHoursAgo = toISOStringSafe(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );
  if (toISOStringSafe(post.created_at) < twentyFourHoursAgo) {
    throw new HttpException("Editing window expired (24 hours)", 403);
  }

  // Create revision record with required fields
  await MyGlobal.prisma.economic_board_post_revisions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      citizen_id: props.citizen.id,
      post_id: props.postId,
      title: post.title,
      body: post.body,
      edited_at: toISOStringSafe(new Date()),
    },
  });

  // Count revisions from database
  const revisionCount =
    await MyGlobal.prisma.economic_board_post_revisions.count({
      where: { post_id: props.postId },
    });

  // Return the object as JSON string to satisfy the string-typed IEconomicBoardPost
  return JSON.stringify({
    id: post.id,
    title: post.title,
    body: post.body,
    status: post.status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at,
    citizen_id: post.citizen_id,
    moderator_approved_id: post.moderator_approved_id,
    moderator_rejected_id: post.moderator_rejected_id,
    moderator_deleted_id: post.moderator_deleted_id,
    category_id: post.category_id,
    revision_count: revisionCount,
  });
}
