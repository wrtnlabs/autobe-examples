import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdministratorAtSummaryTransformer } from "./EcommerceMallAdministratorAtSummaryTransformer";

export namespace EcommerceMallAdministratorGradeTransformer {
  export type Payload = Prisma.ecommerce_mall_administrator_gradesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        grade: true,
        previous_grade: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator: EcommerceMallAdministratorAtSummaryTransformer.select(),
        changedBy: EcommerceMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_administrator_gradesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdministratorGrade> {
    return {
      id: input.id,
      administrator_id: input.administrator.id,
      changed_by: input.changedBy.id,
      grade: input.grade,
      previous_grade: input.previous_grade ?? null,
      reason: input.reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      administrator:
        await EcommerceMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      changedBy: await EcommerceMallAdministratorAtSummaryTransformer.transform(
        input.changedBy,
      ),
    } satisfies IEcommerceMallAdministratorGrade;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallAdministratorGradeTransformer {
//       export type Payload = Prisma.ecommerce_mall_administrator_gradesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             grade: true,
//             previous_grade: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             administrator_id: true,
//             changed_by: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_administrator_gradesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallAdministratorGrade> {
//         return {
//   id: {string},
//   administrator_id: {string},
//   changed_by: {string},
//   grade: {string},
//   previous_grade: {string | null},
//   reason: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   administrator: {IEcommerceMallAdministrator.ISummary},
//   changedBy: {IEcommerceMallAdministrator.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------