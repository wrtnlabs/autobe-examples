import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdminGradeTransition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminGradeTransition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdminAtSummaryTransformer } from "./EcommerceAdminAtSummaryTransformer";

export namespace EcommerceAdminGradeTransitionTransformer {
  export type Payload = Prisma.ecommerce_admin_grade_transitionsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdminGradeTransition> {
    return {
      id: input.id,
      admin: await EcommerceAdminAtSummaryTransformer.transform(input.admin),
      performedByAdmin: await EcommerceAdminAtSummaryTransformer.transform(
        input.performedByAdmin,
      ),
      from_grade: input.from_grade,
      to_grade: input.to_grade,
      changed_at: input.changed_at.toISOString(),
      reason: input.reason ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceAdminGradeTransition;
  }
  export function select() {
    return {
      select: {
        id: true,
        from_grade: true,
        to_grade: true,
        changed_at: true,
        reason: true,
        created_at: true,
        admin: EcommerceAdminAtSummaryTransformer.select(),
        performedByAdmin: EcommerceAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_admin_grade_transitionsFindManyArgs;
  }
}
