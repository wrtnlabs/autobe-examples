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
    return {
      id: v4(),
      name: "Unnamed Grade",
      grade: 0,
      super_administrator: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_administrator_gradesCreateInput;
  }
}
