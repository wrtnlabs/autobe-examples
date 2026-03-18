import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingReportsReportId(props: {
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const now: string & tags.Format<"date-time"> = toISOStringSafe(
      new globalThis.Date(),
    );
    await prisma.hrm_time_tracking_reports.update({
      where: {
        id: props.reportId,
      },
      data: {
        updated_at: new globalThis.Date(now),
        deleted_at: new globalThis.Date(now),
      },
    });
  });
}
