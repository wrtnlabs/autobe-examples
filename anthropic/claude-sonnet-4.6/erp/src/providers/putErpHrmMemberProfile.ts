import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmGuestSessionTransformer } from "../transformers/ErpHrmGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProfile(props: {
  member: MemberPayload;
  body: IErpHrmGuestSession.IUpdate;
}): Promise<IErpHrmGuestSession> {
  // Step 1: Validate the member exists and is active (not soft-deleted)
  await MyGlobal.prisma.erp_hrm_members.findFirstOrThrow({
    where: { id: props.member.id, deleted_at: null },
    select: { id: true },
  });
  // Step 2: Record the profile update timestamp on the member account
  await MyGlobal.prisma.erp_hrm_members.update({
    where: { id: props.member.id },
    data: {
      updated_at: new Date(),
    },
  });
  // Step 3: Return the most recent guest session associated with this member
  // The guest→member lifecycle retains the same UUID (guest.id === member.id)
  const guestSession =
    await MyGlobal.prisma.erp_hrm_guest_sessions.findFirstOrThrow({
      where: {
        erp_hrm_guest_id: props.member.id,
      },
      orderBy: { created_at: "desc" },
      ...ErpHrmGuestSessionTransformer.select(),
    });
  return await ErpHrmGuestSessionTransformer.transform(guestSession);
}
