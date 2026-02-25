import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportsDecisionTransformer } from "../transformers/CommunityPlatformReportsDecisionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminReportsDecisionsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportsDecision.IUpdate;
}): Promise<ICommunityPlatformReportsDecision> {
  const existingDecision =
    await MyGlobal.prisma.community_platform_reports_decisions.findUniqueOrThrow(
      {
        where: { id: props.id },
      },
    );
  const updatedAtISO = new Date().toISOString() as string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.community_platform_reports_decisions.update({
    where: { id: props.id },
    data: {
      comments:
        props.body.comment === undefined
          ? existingDecision.comments
          : props.body.comment,
      updated_at: updatedAtISO,
    },
  });
  const updatedRecord =
    await MyGlobal.prisma.community_platform_reports_decisions.findUniqueOrThrow(
      {
        where: { id: props.id },
        ...CommunityPlatformReportsDecisionTransformer.select(),
      },
    );
  return CommunityPlatformReportsDecisionTransformer.transform(updatedRecord);
}
