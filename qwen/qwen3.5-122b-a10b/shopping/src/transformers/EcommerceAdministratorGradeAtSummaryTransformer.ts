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

export namespace EcommerceAdministratorGradeAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_administrator_gradesGetPayload<
    ReturnType<typeof select>
  >;
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
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdministratorGrade.ISummary> {
    return {
      id: input.id,
      grade: input.grade,
      admin: await EcommerceAdminAtSummaryTransformer.transform(
        input.ecommerceAdmin,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceAdministratorGrade.ISummary;
  }
}
