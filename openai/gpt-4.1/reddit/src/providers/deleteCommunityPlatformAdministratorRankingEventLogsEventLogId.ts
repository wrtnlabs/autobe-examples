import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorRankingEventLogsEventLogId(props: {
  administrator: AdministratorPayload;
  eventLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Confirm event log exists
  const existing =
    await MyGlobal.prisma.community_platform_ranking_event_logs.findUnique({
      where: { id: props.eventLogId },
    });
  if (!existing) {
    throw new HttpException("Ranking event log not found.", 404);
  }

  try {
    await MyGlobal.prisma.community_platform_ranking_event_logs.delete({
      where: { id: props.eventLogId },
    });
    // Secondary audit logging would occur here if audit log table/schema were available.
    return;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003" // Foreign key constraint failed on the field
    ) {
      throw new HttpException(
        "Cannot delete ranking event log: referential integrity constraint violation.",
        409,
      );
    }
    throw error;
  }
}
