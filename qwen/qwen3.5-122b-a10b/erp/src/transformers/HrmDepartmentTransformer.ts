import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmDepartmentAtSummaryTransformer } from "./HrmDepartmentAtSummaryTransformer";
import { HrmOrganizationAtSummaryTransformer } from "./HrmOrganizationAtSummaryTransformer";

export namespace HrmDepartmentTransformer {
  export type Payload = Prisma.hrm_departmentsGetPayload<
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
        organization: HrmOrganizationAtSummaryTransformer.select(),
        parentDepartment: HrmDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_departmentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmDepartment> {
    return {
      id: input.id,
      organization: await HrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      parent: input.parentDepartment
        ? await HrmDepartmentAtSummaryTransformer.transform(
            input.parentDepartment,
          )
        : undefined,
      name: input.name,
      description: input.description ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmDepartment;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmDepartmentTransformer {
//       export type Payload = Prisma.hrm_departmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmOrganizationAtSummaryTransformer.select(),
//             parent_department_id: true,
//             ...
//           },
//         } satisfies Prisma.hrm_departmentsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmDepartment> {
//         return {
//   id: {string},
//   organization: await HrmOrganizationAtSummaryTransformer.transform(input.organization),
//   parent: {IHrmDepartment.ISummary | null},
//   name: {string},
//   description: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------