import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsDepartmentAtSummaryTransformer } from "./HrmsDepartmentAtSummaryTransformer";
import { HrmsOrganizationAtSummaryTransformer } from "./HrmsOrganizationAtSummaryTransformer";

export namespace HrmsDepartmentTransformer {
  export type Payload = Prisma.hrms_departmentsGetPayload<
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
        organization: HrmsOrganizationAtSummaryTransformer.select(),
        parent: HrmsDepartmentAtSummaryTransformer.select(),
        children: HrmsDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrms_departmentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmsDepartment> {
    return {
      id: input.id,
      organization: await HrmsOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      parent: input.parent
        ? await HrmsDepartmentAtSummaryTransformer.transform(input.parent)
        : null,
      name: input.name,
      description: input.description ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      children: await ArrayUtil.asyncMap(
        input.children,
        HrmsDepartmentAtSummaryTransformer.transform,
      ),
    };
  }
}
