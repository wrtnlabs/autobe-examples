import { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallAdministratorGradeCollector {
  export async function collect(props: {
    body: IEcommerceMallAdministratorGrade.ICreate;
    changedBy: IEntity;
  }) {
    const id: string = v4();
    const created_at: Date = new Date();
    // Query current grade to get previous_grade value
    const currentGrade =
      await MyGlobal.prisma.ecommerce_mall_administrator_grades.findFirst({
        where: {
          administrator_id: props.body.administrator_id,
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
        take: 1,
      });
    return {
      id,
      grade: props.body.grade,
      previous_grade: currentGrade ? currentGrade.grade : null,
      reason: props.body.reason ?? null,
      created_at,
      updated_at: created_at,
      deleted_at: null,
      administrator: {
        connect: { id: props.body.administrator_id },
      },
      changedBy: {
        connect: { id: props.changedBy.id },
      },
    } satisfies Prisma.ecommerce_mall_administrator_gradesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallAdministratorGradeCollector {
//         export async function collect(props: {
//           body: IEcommerceMallAdministratorGrade.ICreate;
//           ecommerceMallAdministrators: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       grade: ...,
//       previous_grade: ...,
//       reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       administrator: ...,
//       changedBy: ...,
//       gradeChanges: ...,
//           } satisfies Prisma.ecommerce_mall_administrator_gradesCreateInput;
//         }
//       }
//--------------------------------------------------------------