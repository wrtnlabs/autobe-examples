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

export async function deleteErpHrmMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the timer, 404 if not found
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      organization_member_id: true,
      organizationMember: {
        select: { member_id: true },
      },
    },
  });
  // Step 2: Verify ownership — only the timer's owner may discard it
  if (timer.organizationMember.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Hard delete — no soft-delete column exists on erp_hrm_timers
  await MyGlobal.prisma.erp_hrm_timers.delete({
    where: { id: props.timerId },
  });
}
