import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";
import { HrmTimeTrackingRoleAtSummaryTransformer } from "./HrmTimeTrackingRoleAtSummaryTransformer";

export namespace HrmTimeTrackingOrganizationInvitationAtSummaryTransformer {
  export type Payload =
    Prisma.hrm_time_tracking_organization_invitationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        status: true,
        message: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
        invited_at: true,
        accepted_at: true,
        resolved_at: true,
        expired_at: true,
        cancelled_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_organization_invitationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingOrganizationInvitation.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      message: input.message ?? null,
      role: input.role
        ? await HrmTimeTrackingRoleAtSummaryTransformer.transform(input.role)
        : null,
      invited_at: input.invited_at.toISOString(),
      accepted_at: input.accepted_at?.toISOString() ?? null,
      resolved_at: input.resolved_at?.toISOString() ?? null,
      expired_at: input.expired_at?.toISOString() ?? null,
      cancelled_at: input.cancelled_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
