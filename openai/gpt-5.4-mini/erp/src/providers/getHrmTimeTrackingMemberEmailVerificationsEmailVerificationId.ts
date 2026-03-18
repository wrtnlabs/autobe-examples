import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingMemberEmailVerificationTransformer } from "../transformers/HrmTimeTrackingMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberEmailVerificationsEmailVerificationId(props: {
  member: MemberPayload;
  emailVerificationId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingMemberEmailVerification> {
  const record =
    await MyGlobal.prisma.hrm_time_tracking_member_email_verifications.findFirstOrThrow(
      {
        where: {
          id: props.emailVerificationId,
          member_id: props.member.id,
        },
        ...HrmTimeTrackingMemberEmailVerificationTransformer.select(),
      },
    );
  return await HrmTimeTrackingMemberEmailVerificationTransformer.transform(
    record,
  );
}
