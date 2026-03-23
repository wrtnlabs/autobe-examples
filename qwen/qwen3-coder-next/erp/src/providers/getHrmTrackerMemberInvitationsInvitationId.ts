import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMemberSession";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerPendingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerPendingInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerPendingInvitationTransformer } from "../transformers/HrmTrackerPendingInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerMemberInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IHrmTrackerPendingInvitation> {
  const invitation =
    await MyGlobal.prisma.hrm_tracker_pending_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      ...HrmTrackerPendingInvitationTransformer.select(),
    });
  return await HrmTrackerPendingInvitationTransformer.transform(invitation);
}
