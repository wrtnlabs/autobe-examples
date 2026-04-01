import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingMemberEmailVerificationTransformer } from "../transformers/ErpHrmTimeTrackingMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingMemberEmailVerification> {
  await MyGlobal.prisma.erp_hrm_time_tracking_members.findFirstOrThrow({
    where: { id: props.member.id, deleted_at: null },
    select: { id: true },
  });
  const verification =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_email_verifications.findFirstOrThrow(
      {
        where: {
          id: props.verificationId,
          erp_hrm_time_tracking_member_id: props.member.id,
        },
        ...ErpHrmTimeTrackingMemberEmailVerificationTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingMemberEmailVerificationTransformer.transform(
    verification,
  );
}
