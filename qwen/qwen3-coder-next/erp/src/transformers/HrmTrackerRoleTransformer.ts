import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerOrganizationAtSummaryTransformer } from "./HrmTrackerOrganizationAtSummaryTransformer";

export namespace HrmTrackerRoleTransformer {
  export type Payload = Prisma.hrm_tracker_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        is_custom: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTrackerOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_tracker_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmTrackerRole> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      is_custom: input.is_custom,
      is_default: input.is_default,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization: await HrmTrackerOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
    };
  }
}
