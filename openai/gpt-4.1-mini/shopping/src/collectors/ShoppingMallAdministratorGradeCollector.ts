import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAdministratorGradeCollector {
  export async function collect(props: {
    body: IShoppingMallAdministratorGrade.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      grade: props.body.grade,
      super_administrator: props.body.superAdministrator,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // administrators is hasMany and not created here
    } satisfies Prisma.shopping_mall_administrator_gradesCreateInput;
  }
}
