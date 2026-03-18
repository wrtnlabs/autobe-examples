import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingPermission";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingRoleAtSummaryTransformer } from "./HrmTimeTrackingRoleAtSummaryTransformer";

export namespace HrmTimeTrackingRolePermissionTransformer {
  export type Payload = Prisma.hrm_time_tracking_role_permissionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        hrm_time_tracking_role_id: true,
        permission_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
        permission: true,
      },
    } satisfies Prisma.hrm_time_tracking_role_permissionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingRolePermission> {
    return {
      id: input.id,
      hrm_time_tracking_role_id: input.hrm_time_tracking_role_id,
      permission_id: input.permission_id,
      role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role),
      permission: {} as IHrmTimeTrackingPermission.ISummary,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
