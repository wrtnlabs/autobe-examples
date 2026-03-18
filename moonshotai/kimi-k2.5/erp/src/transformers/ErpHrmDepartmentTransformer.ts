import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmDepartmentAtSummaryTransformer } from "./ErpHrmDepartmentAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";

export namespace ErpHrmDepartmentTransformer {
  export type Payload = Prisma.erp_hrm_departmentsGetPayload<
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
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        parentDepartment: ErpHrmDepartmentAtSummaryTransformer.select(),
        children: ErpHrmDepartmentAtSummaryTransformer.select(),
        organizationMembers: false,
      },
    } satisfies Prisma.erp_hrm_departmentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmDepartment> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      parentDepartment: input.parentDepartment
        ? await ErpHrmDepartmentAtSummaryTransformer.transform(
            input.parentDepartment,
          )
        : null,
      children: await ArrayUtil.asyncMap(
        input.children,
        ErpHrmDepartmentAtSummaryTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
