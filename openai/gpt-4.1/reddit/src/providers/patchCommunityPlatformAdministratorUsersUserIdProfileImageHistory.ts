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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorUsersUserIdProfileImageHistory(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileImageHistory.IRequest;
}): Promise<IPageICommunityPlatformProfileImageHistory.ISummary> {
  // 1. Confirm user exists (not soft-deleted)
  const userRecord = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.userId, deleted_at: null },
  });
  if (!userRecord) {
    throw new HttpException("User not found or deleted", 404);
  }

  // 2. Extract pagination, sorting, filtering criteria
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "uploaded_at";
  const sortDirection = props.body.sort_direction ?? "desc";
  const includeSoftDeleted = props.body.include_soft_deleted ?? false;

  // 3. Validate sortBy and sortDirection
  const validSortBy = ["uploaded_at", "effective_from", "removed_at"];
  const validSortDir = ["asc", "desc"];
  if (!validSortBy.includes(sortBy)) {
    throw new HttpException("Invalid sort_by value", 400);
  }
  if (!validSortDir.includes(sortDirection)) {
    throw new HttpException("Invalid sort_direction value", 400);
  }

  // 4. Build where filter
  const where = {
    community_platform_user_id: props.userId,
    ...(includeSoftDeleted ? {} : { deleted_at: null }),
  };

  // 5. Query records and count concurrently
  const [records, totalCount] = await Promise.all([
    MyGlobal.prisma.community_platform_profile_image_history.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_profile_image_history.count({
      where,
    }),
  ]);

  // 6. Map DB results to output DTO
  const data = records.map((record) => ({
    id: record.id,
    user: { id: record.community_platform_user_id },
    image_uri: record.image_uri,
    uploaded_at: toISOStringSafe(record.uploaded_at),
    effective_from: toISOStringSafe(record.effective_from),
    removed_at: record.removed_at ? toISOStringSafe(record.removed_at) : null,
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data,
  };
}
