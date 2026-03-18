import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingInvitationCollector } from "../collectors/HrmTimeTrackingInvitationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingInvitationTransformer } from "../transformers/HrmTimeTrackingInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberInvitations(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingInvitation.ICreate;
}): Promise<IHrmTimeTrackingInvitation> {
  const created = await MyGlobal.prisma.hrm_time_tracking_invitations.create({
    data: await HrmTimeTrackingInvitationCollector.collect({
      body: props.body,
      organization: {
        id: props.member.session_id,
      },
      invitedByMember: {
        id: props.member.id,
      },
    }),
    ...HrmTimeTrackingInvitationTransformer.select(),
  });
  return await HrmTimeTrackingInvitationTransformer.transform(created);
}
