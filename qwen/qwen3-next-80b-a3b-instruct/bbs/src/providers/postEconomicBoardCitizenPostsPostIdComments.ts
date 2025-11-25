import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postEconomicBoardCitizenPostsPostIdComments(props: {
  citizen: CitizenPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconomicBoardComment.ICreate;
}): Promise<IEconomicBoardComment> {
  // Verify post exists and is published
  const post = await MyGlobal.prisma.economic_board_posts.findUnique({
    where: { id: props.postId },
    select: { status: true },
  });

  if (!post || post.status !== "published") {
    throw new HttpException("Post not found or not published", 404);
  }

  // Create comment
  const created = await MyGlobal.prisma.economic_board_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      body: props.body.body,
      post_id: props.postId,
      citizen_id: props.citizen.id,
      parent_comment_id: props.body.parent_comment_id ?? undefined,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      status: "published",
    },
  });

  return {
    id: created.id,
    body: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    status: created.status as "published" | "deleted",
    post_id: created.post_id,
    citizen_id: created.citizen_id,
    parent_comment_id: created.parent_comment_id ?? undefined,
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    moderator_deleted_id: created.moderator_deleted_id
      ? (created.moderator_deleted_id satisfies string as string)
      : undefined,
  };
}
