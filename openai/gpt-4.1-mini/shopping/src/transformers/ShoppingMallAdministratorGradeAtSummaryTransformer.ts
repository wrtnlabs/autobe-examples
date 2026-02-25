import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdministratorGradeAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_administrator_gradesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        grade: true,
        super_administrator: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrators: true,
      },
    } satisfies Prisma.shopping_mall_administrator_gradesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorGrade.ISummary> {
    return {
      id: input.id,
      name: input.name,
      grade: input.grade,
      superAdministrator: input.super_administrator,
    };
  }
}
