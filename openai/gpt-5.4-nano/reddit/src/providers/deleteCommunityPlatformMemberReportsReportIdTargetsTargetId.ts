import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberReportsReportIdTargetsTargetId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  targetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const isoNow = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
}
