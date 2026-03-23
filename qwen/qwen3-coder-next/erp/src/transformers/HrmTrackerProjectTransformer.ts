import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerOrganizationAtSummaryTransformer } from "./HrmTrackerOrganizationAtSummaryTransformer";

export namespace HrmTrackerProjectTransformer {
  export type Payload = Prisma.hrm_tracker_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTrackerOrganizationAtSummaryTransformer.select(),
        hrm_tracker_organization_id: true,
      },
    } satisfies Prisma.hrm_tracker_projectsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmTrackerProject> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      color: input.color,
      status: typia.assert<"active" | "archived" | "completed">(input.status),
      budget_hours: input.budget_hours ?? null,
      start_date: input.start_date?.toISOString() ?? null,
      end_date: input.end_date?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      hrm_tracker_organization_id: input.hrm_tracker_organization_id,
      organization: await HrmTrackerOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
    };
  }
}
