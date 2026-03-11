import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAdminPasswordResetAtSummaryTransformer } from "../transformers/DiscussionBoardAdminPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberPasswordResets(props: {
  member: MemberPayload;
  body: IDiscussionBoardAdminPasswordReset.IRequest;
}): Promise<IPageIDiscussionBoardAdminPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const now = new Date();
  // This table only contains admin password resets
  // If type is "member", return empty results
  if (props.body.type === "member") {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    } satisfies IPageIDiscussionBoardAdminPasswordReset.ISummary;
  }
  const whereInput: Prisma.discussion_board_admin_password_resetsWhereInput = {
    deleted_at: null,
    ...(props.body.status === "active" && {
      expires_at: { gt: now },
    }),
    ...(props.body.status === "expired" && {
      expires_at: { lte: now },
    }),
    // Note: "used" status not applicable for admin password resets (no used_at field)
    ...(props.body.status === "used" && {
      // Return no results for used status
      deleted_at: { not: null },
    }),
    ...(props.body.search && {
      admin: {
        OR: [
          { email: { contains: props.body.search } },
          { display_name: { contains: props.body.search } },
        ],
      },
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.expires_at_from && {
      expires_at: { gte: new Date(props.body.expires_at_from) },
    }),
    ...(props.body.expires_at_to && {
      expires_at: { lte: new Date(props.body.expires_at_to) },
    }),
  };
  const data =
    await MyGlobal.prisma.discussion_board_admin_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdminPasswordResetAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_admin_password_resets.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdminPasswordResetAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardAdminPasswordReset.ISummary;
}
