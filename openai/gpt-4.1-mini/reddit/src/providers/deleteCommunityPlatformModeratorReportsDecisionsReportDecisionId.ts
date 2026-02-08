import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformModeratorReportsDecisionsReportDecisionId(props: {
  moderator: ModeratorPayload;
  reportDecisionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingDecision =
    await MyGlobal.prisma.community_platform_reports_decisions.findUnique({
      where: { id: props.reportDecisionId },
    });
  if (existingDecision === null) {
    throw new HttpException("Report decision not found", 404);
  }
  await MyGlobal.prisma.community_platform_reports_decisions.delete({
    where: { id: props.reportDecisionId },
  });
}
