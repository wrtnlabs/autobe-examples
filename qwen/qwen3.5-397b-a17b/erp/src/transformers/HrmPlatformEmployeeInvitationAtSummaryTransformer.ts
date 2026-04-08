import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformRoleAtSummaryTransformer } from "./HrmPlatformRoleAtSummaryTransformer";

export namespace HrmPlatformEmployeeInvitationAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_employee_invitationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        position: true,
        employment_type: true,
        status: true,
        invited_at: true,
        expires_at: true,
        accepted_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: { select: { id: true } },
        invitedBy: HrmPlatformMemberAtSummaryTransformer.select(),
        role: HrmPlatformRoleAtSummaryTransformer.select(),
        department: HrmPlatformDepartmentAtSummaryTransformer.select(),
        emailVerification: { select: { id: true } },
      },
    } satisfies Prisma.hrm_platform_employee_invitationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformEmployeeInvitation.ISummary> {
    return {
      id: input.id,
      email: input.email,
      position: input.position ?? null,
      employment_type: input.employment_type,
      status: input.status,
      invited_at: input.invited_at.toISOString(),
      expires_at: input.expires_at.toISOString(),
      accepted_at: input.accepted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      invitedBy: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.invitedBy,
      ),
      role: await HrmPlatformRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
    } satisfies IHrmPlatformEmployeeInvitation.ISummary;
  }
}
