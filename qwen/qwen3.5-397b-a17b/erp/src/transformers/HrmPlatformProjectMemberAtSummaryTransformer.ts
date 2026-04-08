import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";

export namespace HrmPlatformProjectMemberAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_project_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        updated_at: true,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        project: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrm_platform_projectsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_project_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformProjectMember.ISummary> {
    return {
      id: input.id,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      role: input.role,
      created_at: input.created_at.toISOString(),
    } satisfies IHrmPlatformProjectMember.ISummary;
  }
}
