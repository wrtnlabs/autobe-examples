import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeModeratorRoleTransformer } from "../transformers/RedditLikeModeratorRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAdminModerationConduct(props: {
  admin: AdminPayload;
  body: IRedditLikeModeratorRole.IRequest;
}): Promise<IPageIRedditLikeModeratorRole.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const safeLimit = limit > 0 ? limit : 100;
  const skip = (page - 1) * safeLimit;
  // Build search filters from request criteria
  const whereInput: Prisma.reddit_like_moderator_rolesWhereInput = {};
  // Apply role type filter if specified
  if (props.body.role) {
    whereInput.role = props.body.role;
  }
  // Apply user filter if specified
  if (props.body.user_id) {
    whereInput.user_id = props.body.user_id;
  }
  const data = await MyGlobal.prisma.reddit_like_moderator_roles.findMany({
    where: whereInput,
    skip,
    take: safeLimit,
    orderBy: { created_at: "desc" },
    ...RedditLikeModeratorRoleTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_moderator_roles.count({
    where: whereInput,
  });
  const paginatedData = await ArrayUtil.asyncMap(
    data,
    RedditLikeModeratorRoleTransformer.transform,
  );
  const totalPages = safeLimit > 0 ? Math.ceil(total / safeLimit) : 0;
  return {
    data: paginatedData,
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
