import { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardHealthCheck";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorHealthChecks(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardHealthCheck.IRequest;
}): Promise<IPageIDiscussionBoardHealthCheck.ISummary> {
  try {
    const page = 1;
    const limit = 100;
    const skip = (page - 1) * limit;
    const data = await MyGlobal.prisma.discussion_board_health_checks.findMany({
      skip,
      take: limit,
      orderBy: { checked_at: "desc" },
    });
    const total = await MyGlobal.prisma.discussion_board_health_checks.count();
    return {
      data: data.map((record) => ({
        id: record.id,
        status: record.status,
        checked_at: toISOStringSafe(record.checked_at),
        details: record.details === null ? undefined : record.details,
        created_at: toISOStringSafe(record.created_at),
        updated_at:
          record.updated_at === null
            ? null
            : toISOStringSafe(record.updated_at),
      })),
      pagination: {
        current: page,
        limit,
        records: total,
        pages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  } catch (e) {
    throw new HttpException(
      e instanceof Error ? e.message : "Internal Server Error",
      500,
    );
  }
}
