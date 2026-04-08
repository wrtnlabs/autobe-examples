import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformDepartmentsSnapshotCollector {
  export async function collect(props: {
    body: IHrmPlatformDepartmentsSnapshot.ICreate;
    hrmPlatformDepartments: IEntity;
  }) {
    const id: string = v4();
    // Query only available fields from source department table
    const department =
      await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
        where: { id: props.hrmPlatformDepartments.id },
        select: {
          id: true,
          name: true,
          parent_department_id: true,
          created_at: true,
          updated_at: true,
        },
      });
    return {
      id,
      name: department.name,
      description: null,
      color: null,
      parent_department_id: department.parent_department_id,
      fiscal_start_month: null,
      timezone: null,
      status: "active",
      created_at: new Date(),
      updated_at: department.updated_at,
      department: { connect: { id: department.id } },
    } satisfies Prisma.hrm_platform_departments_snapshotsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformDepartmentsSnapshotCollector {
//         export async function collect(props: {
//           body: IHrmPlatformDepartmentsSnapshot.ICreate;
//           hrmPlatformDepartments: IEntity; // from path parameter departmentId
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       color: ...,
//       parent_department_id: ...,
//       fiscal_start_month: ...,
//       timezone: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       department: ...,
//           } satisfies Prisma.hrm_platform_departments_snapshotsCreateInput;
//         }
//       }
//--------------------------------------------------------------