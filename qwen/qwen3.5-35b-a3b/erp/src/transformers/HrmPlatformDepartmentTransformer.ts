import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformDepartmentTransformer {
  export type Payload = Prisma.hrm_platform_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        parentDepartment: HrmPlatformDepartmentAtSummaryTransformer.select(),
        childDepartments: HrmPlatformDepartmentAtSummaryTransformer.select(),
        snapshots: true,
        employees: true,
        employeeSnapshots: true,
      },
    } satisfies Prisma.hrm_platform_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformDepartment> {
    return {
      id: input.id,
      name: input.name,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      parentDepartment: input.parentDepartment
        ? await HrmPlatformDepartmentAtSummaryTransformer.transform(
            input.parentDepartment,
          )
        : undefined,
      childDepartments: await ArrayUtil.asyncMap(input.childDepartments, (cd) =>
        HrmPlatformDepartmentAtSummaryTransformer.transform(cd),
      ),
    } satisfies IHrmPlatformDepartment;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformDepartmentTransformer {
//       export type Payload = Prisma.hrm_platform_departmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//             parent_department_id: true,
//             ...
//           },
//         } satisfies Prisma.hrm_platform_departmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformDepartment> {
//         return {
//   id: {string},
//   name: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//   parentDepartment: {IHrmPlatformDepartment.ISummary | null},
//   childDepartments: {Array<IHrmPlatformDepartment.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------