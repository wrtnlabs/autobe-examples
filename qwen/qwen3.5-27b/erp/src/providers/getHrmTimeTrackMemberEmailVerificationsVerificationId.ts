import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackMemberEmailVerificationTransformer } from "../transformers/HrmTimeTrackMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackMemberEmailVerification> {
  const record =
    await MyGlobal.prisma.hrm_time_track_member_email_verifications.findFirstOrThrow(
      {
        ...HrmTimeTrackMemberEmailVerificationTransformer.select(),
        where: {
          id: props.verificationId,
          deleted_at: null,
        },
      },
    );
  return await HrmTimeTrackMemberEmailVerificationTransformer.transform(record);
}
