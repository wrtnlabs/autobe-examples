import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorGradeAtSummaryTransformer } from "./EcommerceAdministratorGradeAtSummaryTransformer";

export namespace EcommerceAdminTransformer {
  export type Payload = Prisma.ecommerce_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administratorGrade:
          EcommerceAdministratorGradeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_adminsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceAdmin> {
    return {
      id: input.id,
      email: input.email,
      grade: input.administratorGrade
        ? await EcommerceAdministratorGradeAtSummaryTransformer.transform(
            input.administratorGrade,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceAdmin;
  }
}
