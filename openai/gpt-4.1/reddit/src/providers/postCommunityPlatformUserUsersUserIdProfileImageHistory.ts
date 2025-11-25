import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserUsersUserIdProfileImageHistory(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileImageHistory.ICreate;
}): Promise<ICommunityPlatformProfileImageHistory> {
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "You are not authorized to modify this user's profile image history.",
      403,
    );
  }

  const created =
    await MyGlobal.prisma.community_platform_profile_image_history.create({
      data: {
        id: v4(),
        community_platform_user_id: props.userId,
        image_uri: props.body.image_uri,
        uploaded_at: props.body.uploaded_at,
        effective_from: props.body.effective_from,
      },
    });

  return {
    id: created.id,
    community_platform_user_id: created.community_platform_user_id,
    image_uri: created.image_uri,
    uploaded_at: toISOStringSafe(created.uploaded_at),
    effective_from: toISOStringSafe(created.effective_from),
    removed_at:
      created.removed_at !== null && created.removed_at !== undefined
        ? toISOStringSafe(created.removed_at)
        : created.removed_at,
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : created.deleted_at,
  };
}
