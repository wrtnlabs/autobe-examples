import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackDepartmentAtSummaryTransformer } from "./HrmTimeTrackDepartmentAtSummaryTransformer";
import { HrmTimeTrackOrganizationAtSummaryTransformer } from "./HrmTimeTrackOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackDepartmentTransformer {
  export type Payload = Prisma.hrm_time_track_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTimeTrackOrganizationAtSummaryTransformer.select(),
        parentDepartment: HrmTimeTrackDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackDepartment> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      organization:
        await HrmTimeTrackOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      parentDepartment: input.parentDepartment
        ? await HrmTimeTrackDepartmentAtSummaryTransformer.transform(
            input.parentDepartment,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
