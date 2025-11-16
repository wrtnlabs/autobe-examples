import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postDiscussionBoardUserModerationReports(props: {
  user: UserPayload;
  body: IDiscussionBoardReport.ICreate;
}): Promise<IDiscussionBoardReport> {
  try {
    const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.discussion_board_reports.create({
      data: {
        id: v4(),
        reporter_user_id: props.user.id,
        target_type: props.body.target_type,
        target_id: props.body.target_id,
        reason: props.body.reason,
        description: props.body.description ?? null,
        status: "open",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    return {
      id: created.id,
      target_type: created.target_type,
      target_id: created.target_id,
      reason: created.reason,
      description: created.description ?? undefined,
      status: created.status,
      reporter_user_id: created.reporter_user_id,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? undefined
          : toISOStringSafe(created.deleted_at),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate report: You have already reported this item.",
        409,
      );
    }
    throw error;
  }
}
