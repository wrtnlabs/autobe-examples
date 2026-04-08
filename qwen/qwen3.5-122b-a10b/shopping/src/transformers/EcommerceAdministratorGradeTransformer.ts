import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdminAtSummaryTransformer } from "./EcommerceAdminAtSummaryTransformer";

export namespace EcommerceAdministratorGradeTransformer {
  export type Payload = Prisma.ecommerce_administrator_gradesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdministratorGrade> {
    return {
      id: input.id,
      ecommerceAdmin: await EcommerceAdminAtSummaryTransformer.transform(
        input.ecommerceAdmin,
      ),
      grade: input.grade,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceAdministratorGrade;
  }
  export function select() {
    return {
      select: {
        id: true,
        grade: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ecommerceAdmin: EcommerceAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_administrator_gradesFindManyArgs;
  }
}
