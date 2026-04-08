import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackRoleAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        is_builtin: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {},
        } satisfies Prisma.hrm_time_track_organizationsFindManyArgs,
        guestInvitations: {
          select: {},
        } satisfies Prisma.hrm_time_track_guestsFindManyArgs,
        employees: {
          select: {},
        } satisfies Prisma.hrm_time_track_employeesFindManyArgs,
        employeeSnapshots: {
          select: {},
        } satisfies Prisma.hrm_time_track_employee_snapshotsFindManyArgs,
        snapshots: {
          select: {},
        } satisfies Prisma.hrm_time_track_role_snapshotsFindManyArgs,
        permissions: {
          select: {},
        } satisfies Prisma.hrm_time_track_role_permissionsFindManyArgs,
        activityLogs: {
          select: {},
        } satisfies Prisma.hrm_time_track_activity_logsFindManyArgs,
      },
    } satisfies Prisma.hrm_time_track_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      is_builtin: input.is_builtin,
      created_at: input.created_at.toISOString(),
    };
  }
}
