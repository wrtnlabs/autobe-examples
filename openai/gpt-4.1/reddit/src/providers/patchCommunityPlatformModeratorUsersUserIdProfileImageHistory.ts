import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorUsersUserIdProfileImageHistory(props: {
  moderator: ModeratorPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileImageHistory.IRequest;
}): Promise<IPageICommunityPlatformProfileImageHistory.ISummary> {
  if (props.userId !== props.body.user_id) {
    throw new HttpException(
      "Requested user_id does not match path parameter.",
      400,
    );
  }

  const page = props.body.page ? Number(props.body.page) : 1;
  const limit = props.body.limit ? Number(props.body.limit) : 100;
  const skip = (page - 1) * limit;

  const where = {
    user_id: props.body.user_id,
    ...(props.body.include_soft_deleted ? {} : { deleted_at: null }),
  };

  const orderByField = props.body.sort_by ?? "uploaded_at";
  const orderDirection = props.body.sort_direction ?? "desc";
  const orderBy = { [orderByField]: orderDirection };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_profile_image_history.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: true,
      },
    }),
    MyGlobal.prisma.community_platform_profile_image_history.count({ where }),
  ]);

  const data = records.map((record) => ({
    id: record.id,
    user: { id: record.user.id },
    image_uri: record.image_uri,
    uploaded_at: toISOStringSafe(record.uploaded_at),
    effective_from: toISOStringSafe(record.effective_from),
    removed_at:
      typeof record.removed_at === "string"
        ? record.removed_at
        : record.removed_at
          ? toISOStringSafe(record.removed_at)
          : null,
    deleted_at:
      typeof record.deleted_at === "string"
        ? record.deleted_at
        : record.deleted_at
          ? toISOStringSafe(record.deleted_at)
          : undefined,
  }));

  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
