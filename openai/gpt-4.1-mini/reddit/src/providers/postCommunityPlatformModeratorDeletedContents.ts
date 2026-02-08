import { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorDeletedContents(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformDeletedContent.ICreate;
}): Promise<ICommunityPlatformDeletedContent> {
  // Extract and cast to any to access properties safely due to type incompatibility
  const body = props.body as any;
  if (!body.user_id) {
    throw new HttpException("user_id is required", 400);
  }
  if (!body.reason) {
    throw new HttpException("reason is required", 400);
  }
  if (!body.post_id && !body.comment_id) {
    throw new HttpException(
      "Either post_id or comment_id must be provided",
      400,
    );
  }
  const id = v4();
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_deleted_contents.create({
      data: {
        id,
        moderator: { connect: { id: props.moderator.id } },
        user: { connect: { id: body.user_id } },
        reason: body.reason,
        post_id: body.post_id ?? null,
        comment_id: body.comment_id ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    moderator_id: created.moderator_id,
    user_id: created.user_id,
    reason: created.reason,
    post_id: created.post_id ?? null,
    comment_id: created.comment_id ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
