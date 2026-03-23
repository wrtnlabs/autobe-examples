import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerMemberAtSummaryTransformer {
  export type Payload = Prisma.hrm_tracker_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        avatar_url: true,
        phone: true,
        status: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        ownedOrganization: true,
        sentInvitations: true,
        employees: true,
        employeeRoleChanges: true,
        employeeHistoryChanges: true,
        reviewedTimesheets: true,
        activityLogs: true,
      },
    } satisfies Prisma.hrm_tracker_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerMember.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name,
      avatar_url: input.avatar_url ?? null,
      phone: input.phone ?? null,
      status: typia.assert<"active" | "deactivated">(input.status),
      email_verified: input.email_verified,
    };
  }
}
