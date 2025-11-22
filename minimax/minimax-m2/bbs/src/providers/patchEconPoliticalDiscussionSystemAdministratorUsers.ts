import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import { IPageIEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SystemadministratorPayload } from "../decorators/payload/SystemadministratorPayload";

export async function patchEconPoliticalDiscussionSystemAdministratorUsers(props: {
  systemAdministrator: SystemadministratorPayload;
  body: IEconPoliticalDiscussionUser.IRequest;
}): Promise<IPageIEconPoliticalDiscussionUser.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build search conditions for text matching
  const whereCondition: Record<string, unknown> = {
    deleted_at: null, // Only include non-deleted users
  };

  // Add search conditions for display_name and bio
  if (props.body.search) {
    whereCondition.OR = [
      { display_name: { contains: props.body.search, mode: "insensitive" } },
      { bio: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Add status filtering
  if (props.body.status) {
    whereCondition.status = props.body.status;
  }

  // Configure sorting with defaults
  const orderByField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_direction ?? "desc";

  const orderBy = {
    [orderByField]: orderDirection,
  };

  // Execute paginated query with count
  const [users, total] = await Promise.all([
    MyGlobal.prisma.econ_political_discussion_users.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        display_name: true,
        avatar_url: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.econ_political_discussion_users.count({
      where: whereCondition,
    }),
  ]);

  // Transform results to API format
  const data = users.map((user) => ({
    id: user.id as string & tags.Format<"uuid">,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    status: user.status,
  }));

  // Return paginated response
  return {
    data,
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
