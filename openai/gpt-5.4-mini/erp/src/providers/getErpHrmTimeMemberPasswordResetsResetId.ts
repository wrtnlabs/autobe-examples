import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeMemberPasswordResetTransformer } from "../transformers/ErpHrmTimeMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeMemberPasswordReset> {
  const reset =
    await MyGlobal.prisma.erp_hrm_time_member_password_resets.findFirstOrThrow({
      where: {
        id: props.resetId,
        deleted_at: null,
      },
      ...ErpHrmTimeMemberPasswordResetTransformer.select(),
    });
  return await ErpHrmTimeMemberPasswordResetTransformer.transform(reset);
}
