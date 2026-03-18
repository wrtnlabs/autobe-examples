import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";

export namespace ErpHrmProjectMemberTransformer {
  export type Payload = Prisma.erp_hrm_project_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: ErpHrmProjectAtSummaryTransformer.select(),
        organizationMember:
          ErpHrmOrganizationMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_project_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmProjectMember> {
    return {
      id: input.id,
      role: input.role as "member" | "project-lead",
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      organizationMember:
        await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
          input.organizationMember,
        ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
