import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMemberSession";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerPendingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerPendingInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerMemberAtSummaryTransformer } from "./HrmTrackerMemberAtSummaryTransformer";
import { HrmTrackerMemberSessionAtSummaryTransformer } from "./HrmTrackerMemberSessionAtSummaryTransformer";
import { HrmTrackerOrganizationAtSummaryTransformer } from "./HrmTrackerOrganizationAtSummaryTransformer";

export namespace HrmTrackerPendingInvitationTransformer {
  // 1. Payload type first
  export type Payload = Prisma.hrm_tracker_pending_invitationsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        message: true,
        role_name: true,
        department_name: true,
        invited_at: true,
        resolved_at: true,
        status: true,
        token: true,
        organization: HrmTrackerOrganizationAtSummaryTransformer.select(),
        invitedByMember: HrmTrackerMemberAtSummaryTransformer.select(),
        invitedByMemberSession:
          HrmTrackerMemberSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_tracker_pending_invitationsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerPendingInvitation> {
    return {
      id: input.id,
      email: input.email,
      message: input.message ?? undefined,
      role_name: input.role_name ?? undefined,
      department_name: input.department_name ?? undefined,
      invited_at: input.invited_at?.toISOString() ?? undefined,
      resolved_at: input.resolved_at?.toISOString() ?? undefined,
      status: input.status,
      token: input.token,
      organization: await HrmTrackerOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      invited_by: input.invitedByMember
        ? await HrmTrackerMemberAtSummaryTransformer.transform(
            input.invitedByMember,
          )
        : undefined,
      invitedByMemberSession: input.invitedByMemberSession
        ? await HrmTrackerMemberSessionAtSummaryTransformer.transform(
            input.invitedByMemberSession,
          )
        : undefined,
    };
  }
}
