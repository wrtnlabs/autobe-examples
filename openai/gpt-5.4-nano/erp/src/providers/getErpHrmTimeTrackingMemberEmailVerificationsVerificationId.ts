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
  const verification =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_email_verifications.findFirstOrThrow(
      {
        where: {
          id: props.verificationId,
          deleted_at: null,
          member: {
            id: props.member.id,
          },
        },
        ...ErpHrmTimeTrackingMemberEmailVerificationTransformer.select(),
      } as any,
    );
  return await ErpHrmTimeTrackingMemberEmailVerificationTransformer.transform(
    verification,
  );
}
