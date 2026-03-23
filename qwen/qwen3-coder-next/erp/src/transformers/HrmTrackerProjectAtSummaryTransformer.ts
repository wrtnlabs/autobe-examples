import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerOrganizationAtSummaryTransformer } from "./HrmTrackerOrganizationAtSummaryTransformer";

export namespace HrmTrackerProjectAtSummaryTransformer {
  export type Payload = Prisma.hrm_tracker_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        color: true,
        status: true,
        start_date: true,
        end_date: true,
        organization: HrmTrackerOrganizationAtSummaryTransformer.select(),
        created_at: true,
      },
    } satisfies Prisma.hrm_tracker_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerProject.ISummary> {
    return {
      id: input.id,
      name: input.name,
      color: input.color,
      status: input.status,
      start_date: input.start_date?.toISOString() ?? null,
      end_date: input.end_date?.toISOString() ?? null,
      organization: await HrmTrackerOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
