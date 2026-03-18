import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";
import { HrmTimeTrackingRolePermissionTransformer } from "./HrmTimeTrackingRolePermissionTransformer";

export namespace HrmTimeTrackingRoleTransformer {
  export type Payload = Prisma.hrm_time_tracking_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        built_in: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        organizationInvitations: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_time_tracking_organization_invitationsFindManyArgs,
        permissions: HrmTimeTrackingRolePermissionTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingRole> {
    return {
      id: input.id,
      name: input.name,
      built_in: input.built_in,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      permissions: await ArrayUtil.asyncMap(
        input.permissions,
        HrmTimeTrackingRolePermissionTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
