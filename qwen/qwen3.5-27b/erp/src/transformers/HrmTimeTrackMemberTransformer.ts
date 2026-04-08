import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackMemberTransformer {
  export type Payload = Prisma.hrm_time_track_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: { select: {} },
        passwordResets: { select: {} },
        emailVerifications: { select: {} },
        employees: { select: {} },
        employeeSnapshots: { select: {} },
        roleSnapshots: { select: {} },
        approvedTimesheets: { select: {} },
        timesheetSnapshots: { select: {} },
        timerSnapshots: { select: {} },
        activityLogs: { select: {} },
        taskHistoryEntries: { select: {} },
      },
    } satisfies Prisma.hrm_time_track_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackMember> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
