import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformInvitationTransformer } from "../transformers/HrmPlatformInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformInvitation> {
  const invitation =
    await MyGlobal.prisma.hrm_platform_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      ...HrmPlatformInvitationTransformer.select(),
    });
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: invitation.organization.id,
      deleted_at: null,
    },
  } satisfies Prisma.hrm_platform_employeesFindFirstArgs);
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmPlatformInvitationTransformer.transform(invitation);
}
