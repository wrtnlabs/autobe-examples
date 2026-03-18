import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmTimeTrackingMemberSessionTransformer } from "../transformers/HrmTimeTrackingMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingGuestSessions(props: {
  guest: GuestPayload;
  body: IHrmTimeTrackingMemberSession.IRequest;
}): Promise<IHrmTimeTrackingMemberSession> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_member_sessions.findFirstOrThrow({
      where: {
        id: props.guest.session_id,
        hrm_time_tracking_member_id: props.guest.id,
        expired_at: {
          gt: new globalThis.Date(),
        },
      },
      ...HrmTimeTrackingMemberSessionTransformer.select(),
    });
  if (props.body.organization_id.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmTimeTrackingMemberSessionTransformer.transform(session);
}
