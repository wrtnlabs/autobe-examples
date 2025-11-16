import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";
import { IPageICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileImageHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserUsersUserIdProfileImageHistory(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileImageHistory.IRequest;
}): Promise<IPageICommunityPlatformProfileImageHistory.ISummary> {
  // Security: user can only view their own audit history
  if (props.user.id !== props.userId || props.body.user_id !== props.userId) {
    throw new HttpException(
      "Forbidden: cannot view another user's image history.",
      403,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Determine order by
  const sortField = props.body.sort_by ?? "uploaded_at";
  const sortDirection = props.body.sort_direction ?? "desc";

  // Where filter (with or without soft-deleted)
  const where = {
    user_id: props.userId,
    ...(props.body.include_soft_deleted ? {} : { deleted_at: null }),
  };

  // Retrieve (paginated) records and total count concurrently
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_profile_image_history.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortDirection },
    }),
    MyGlobal.prisma.community_platform_profile_image_history.count({ where }),
  ]);

  // Retrieve user summary once
  const userSummary = { id: props.userId };

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((row) => ({
      id: row.id,
      user: userSummary,
      image_uri: row.image_uri,
      uploaded_at: toISOStringSafe(row.uploaded_at),
      effective_from: toISOStringSafe(row.effective_from),
      removed_at: row.removed_at ? toISOStringSafe(row.removed_at) : null,
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
