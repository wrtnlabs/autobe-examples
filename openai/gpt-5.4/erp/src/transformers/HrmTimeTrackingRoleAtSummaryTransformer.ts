import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackingRoleAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingRole.ISummary> {
    return {
      id: input.id,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      name: input.name,
      built_in: input.built_in,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        name: true,
        built_in: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_rolesFindManyArgs;
  }
  export type Payload = Prisma.hrm_time_tracking_rolesGetPayload<
    ReturnType<typeof select>
  >;
}
