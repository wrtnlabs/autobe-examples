import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
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

export async function postCommunityPlatformReportReasons(props: {
  body: ICommunityPlatformReportReason.ICreate;
}): Promise<ICommunityPlatformReportReason> {
  const reason_text = (props.body as any).reason_text;
  if (!reason_text || reason_text.trim() === "") {
    throw new HttpException("reason_text is required and cannot be empty", 400);
  }
  // Generate ISO 8601 date-time string without using native Date type directly
  const nowISOString = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_report_reasons.create({
      data: {
        id: v4(),
        reason_text: reason_text,
        created_at: nowISOString,
        updated_at: nowISOString,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    reason_text: created.reason_text,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: null,
  };
}
