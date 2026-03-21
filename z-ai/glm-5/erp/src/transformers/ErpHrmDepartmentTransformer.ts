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
        parent: ErpHrmDepartmentAtSummaryTransformer.select(),
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
      parent:
        input.parent !== null
          ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.parent)
          : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at:
        input.deleted_at !== null ? input.deleted_at.toISOString() : null,
    };
  }
}
