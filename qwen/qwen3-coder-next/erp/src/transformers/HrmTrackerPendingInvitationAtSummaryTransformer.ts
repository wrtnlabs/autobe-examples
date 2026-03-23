import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerPendingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerPendingInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerOrganizationAtSummaryTransformer } from "./HrmTrackerOrganizationAtSummaryTransformer";

export namespace HrmTrackerPendingInvitationAtSummaryTransformer {
  export type Payload = Prisma.hrm_tracker_pending_invitationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        role_name: true,
        department_name: true,
        status: true,
        invited_at: true,
        resolved_at: true,
        organization: HrmTrackerOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_tracker_pending_invitationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerPendingInvitation.ISummary> {
    return {
      id: input.id,
      email: input.email,
      role_name: input.role_name ?? undefined,
      department_name: input.department_name ?? undefined,
      status: typia.assert<"pending" | "accepted" | "expired" | "cancelled">(
        input.status,
      ),
      invited_at: input.invited_at?.toISOString() ?? undefined,
      resolved_at: input.resolved_at?.toISOString() ?? undefined,
      organization: await HrmTrackerOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
    };
  }
}
