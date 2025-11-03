import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminRedditCommunityReportReasons(props: {
  admin: AdminPayload;
  body: IRedditCommunityReportReason.ICreate;
}): Promise<IRedditCommunityReportReason> {
  const created = await MyGlobal.prisma.reddit_community_report_reasons.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reason_code: props.body.reason_code,
      reason_name: props.body.reason_name,
      description: props.body.description ?? undefined,
    },
  });

  return {
    id: created.id,
    reason_code: created.reason_code,
    reason_name: created.reason_name,
    description: created.description ?? undefined,
    created_at: toISOStringSafe((created as any)?.created_at ?? new Date()),
    updated_at: toISOStringSafe((created as any)?.updated_at ?? new Date()),
  };
}
