import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackOrganizationAtSummaryTransformer } from "./HrmTimeTrackOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackProjectAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        color_code: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTimeTrackOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackProject.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      color_code: input.color_code,
      status: input.status,
      budget_hours: input.budget_hours ?? null,
      start_date: input.start_date?.toISOString() ?? null,
      end_date: input.end_date?.toISOString() ?? null,
      organization:
        await HrmTimeTrackOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
