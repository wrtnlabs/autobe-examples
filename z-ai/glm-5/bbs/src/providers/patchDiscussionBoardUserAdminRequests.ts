import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardAdminRequestAtSummaryTransformer } from "../transformers/DiscussionBoardAdminRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserAdminRequests(props: {
  user: UserPayload;
  body: IDiscussionBoardAdminRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequest.ISummary> {
  // Authorization: Only super administrators can access
  const currentUser =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: props.user.id },
      select: { permission_level: true },
    });
  if (currentUser.permission_level !== "SUPER_ADMINISTRATOR") {
    throw new HttpException(
      "Only super administrators can view admin requests",
      403,
    );
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause from filters
  const whereInput = {
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.search !== undefined && {
      reason: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.created_at_from !== undefined &&
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            gte: new Date(props.body.created_at_from),
            lte: new Date(props.body.created_at_to),
          },
        }
      : props.body.created_at_from !== undefined
        ? { created_at: { gte: new Date(props.body.created_at_from) } }
        : props.body.created_at_to !== undefined
          ? { created_at: { lte: new Date(props.body.created_at_to) } }
          : {}),
  } satisfies Prisma.discussion_board_admin_requestsWhereInput;
  // Query with pagination and transformer select
  const requests =
    await MyGlobal.prisma.discussion_board_admin_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdminRequestAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_admin_requests.count({
    where: whereInput,
  });
  // Transform and return paginated response
  const data = await ArrayUtil.asyncMap(
    requests,
    DiscussionBoardAdminRequestAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
