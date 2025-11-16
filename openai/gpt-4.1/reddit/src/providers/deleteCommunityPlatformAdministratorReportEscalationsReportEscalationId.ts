import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorReportEscalationsReportEscalationId(props: {
  administrator: AdministratorPayload;
  reportEscalationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Retrieve the escalation record
  const escalation =
    await MyGlobal.prisma.community_platform_report_escalations.findUnique({
      where: { id: props.reportEscalationId },
    });

  if (!escalation) {
    throw new HttpException("Report escalation not found.", 404);
  }

  // Only allow deletion if escalation is not active
  if (escalation.escalation_status === "active") {
    throw new HttpException("Cannot delete an active escalation.", 409);
  }

  await MyGlobal.prisma.community_platform_report_escalations.delete({
    where: { id: props.reportEscalationId },
  });
}
