import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminUsersStatistics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUser.IRequest;
}): Promise<IPageIDiscussionBoardUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions for user filtering
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      display_name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.email && { email: props.body.email }),
  } satisfies Prisma.discussion_board_usersWhereInput;
  // Build orderBy based on sort option
  const orderByInput = (
    props.body.sort === "oldest"
      ? { created_at: "asc" as const }
      : props.body.sort === "display_name_asc"
        ? { display_name: "asc" as const }
        : props.body.sort === "display_name_desc"
          ? { display_name: "desc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.discussion_board_usersOrderByWithRelationInput;
  // Query users with basic information
  const users = await MyGlobal.prisma.discussion_board_users.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      display_name: true,
      bio: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_users.count({
    where: whereInput,
  });
  // Transform to match the response DTO
  const data = users.map((user) => ({
    id: user.id as string & tags.Format<"uuid">,
    display_name: user.display_name,
    bio: user.bio === null ? null : user.bio,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
