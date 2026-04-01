import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeDepartmentAtSummaryTransformer } from "./ErpHrmTimeDepartmentAtSummaryTransformer";

export namespace ErpHrmTimeDepartmentTransformer {
  export type Payload = Prisma.erp_hrm_time_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization: ErpHrmTimeDepartmentAtSummaryTransformer.select(),
        parentDepartment: ErpHrmTimeDepartmentAtSummaryTransformer.select(),
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_time_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeDepartment> {
    return {
      id: input.id,
      organization: await ErpHrmTimeDepartmentAtSummaryTransformer.transform(
        input.organization,
      ),
      parentDepartment: input.parentDepartment
        ? await ErpHrmTimeDepartmentAtSummaryTransformer.transform(
            input.parentDepartment,
          )
        : null,
      name: input.name,
      description: input.description,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
