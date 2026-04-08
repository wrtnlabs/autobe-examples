import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackMemberPasswordResetTransformer } from "../transformers/HrmTimeTrackMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackMemberPasswordReset> {
  const record =
    await MyGlobal.prisma.hrm_time_track_member_password_resets.findFirstOrThrow(
      {
        ...HrmTimeTrackMemberPasswordResetTransformer.select(),
        where: {
          id: props.resetId,
          deleted_at: null,
          hrm_time_track_member_id: props.member.id,
        },
      },
    );
  const now = new Date();
  if (record.expired_at < now) {
    throw new HttpException("Token has expired", 410);
  }
  if (record.used_at !== null) {
    throw new HttpException("Token has already been used", 409);
  }
  return await HrmTimeTrackMemberPasswordResetTransformer.transform(record);
}
