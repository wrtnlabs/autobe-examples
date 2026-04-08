import { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceAdministratorGradeCollector {
  export async function collect(props: {
    body: IEcommerceAdministratorGrade.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      grade: props.body.grade,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      ecommerceAdmin: { connect: { id: props.body.ecommerce_admin_id } },
    } satisfies Prisma.ecommerce_administrator_gradesCreateInput;
  }
}
