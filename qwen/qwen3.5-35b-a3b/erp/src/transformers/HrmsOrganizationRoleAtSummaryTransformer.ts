import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsOrganizationAtSummaryTransformer } from "./HrmsOrganizationAtSummaryTransformer";

export namespace HrmsOrganizationRoleAtSummaryTransformer {
  export type Payload = Prisma.hrms_organization_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        is_builtin: true,
        created_at: true,
        updated_at: true,
        organization: HrmsOrganizationAtSummaryTransformer.select(),
        _count: {
          select: {
            organizationMembers: true,
          },
        },
      },
    } satisfies Prisma.hrms_organization_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsOrganizationRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      is_builtin: input.is_builtin,
      organization: await HrmsOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      members_count: input._count.organizationMembers,
    };
  }
}
