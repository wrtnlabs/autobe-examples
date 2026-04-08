import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeMemberEmailVerificationTransformer } from "../transformers/ErpHrmTimeMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeMemberEmailVerification> {
  const verification =
    await MyGlobal.prisma.erp_hrm_time_member_email_verifications.findUniqueOrThrow(
      {
        where: {
          id: props.verificationId,
          member_id: props.member.id,
        },
        ...ErpHrmTimeMemberEmailVerificationTransformer.select(),
      },
    );
  return await ErpHrmTimeMemberEmailVerificationTransformer.transform(
    verification,
  );
}
