import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";

export namespace ShoppingMallAdministratorGradeChangeTransformer {
  export type Payload =
    Prisma.shopping_mall_administrator_grade_changesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        previous_grade: true,
        new_grade: true,
        change_type: true,
        created_at: true,
        administrator: ShoppingMallAdministratorAtSummaryTransformer.select(),
        performedBy: ShoppingMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_administrator_grade_changesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorGradeChange> {
    return {
      id: input.id,
      administrator:
        await ShoppingMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      performedBy:
        await ShoppingMallAdministratorAtSummaryTransformer.transform(
          input.performedBy,
        ),
      previousGrade: input.previous_grade,
      newGrade: input.new_grade,
      changeType: input.change_type,
      createdAt: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallAdministratorGradeChangeTransformer {
//       export type Payload = Prisma.shopping_mall_administrator_grade_changesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             previous_grade: true,
//             new_grade: true,
//             change_type: true,
//             created_at: true,
//             administrator_id: true,
//             performed_by_id: true,
//             ...
//           },
//         } satisfies Prisma.shopping_mall_administrator_grade_changesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallAdministratorGradeChange> {
//         return {
//   id: {string},
//   administrator: {IShoppingMallAdministrator.ISummary},
//   performedBy: {IShoppingMallAdministrator.ISummary},
//   previousGrade: {string},
//   newGrade: {string},
//   changeType: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------