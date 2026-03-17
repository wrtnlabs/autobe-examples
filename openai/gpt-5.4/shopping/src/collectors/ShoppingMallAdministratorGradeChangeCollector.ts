import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAdministratorGradeChangeCollector {
  export async function collect(props: {
    body: IShoppingMallAdministratorGradeChange.ICreate;
    administrator: IEntity;
    superAdministrator: IEntity;
  }) {
    const id: string = v4();
    await MyGlobal.prisma.shopping_mall_administrators.findFirstOrThrow({
      where: { id: props.administrator.id },
    });
    return {
      id,
      previous_grade: "",
      new_grade: "",
      reason: props.body.reason ?? null,
      created_at: new Date(),
      administrator: {
        connect: { id: props.administrator.id },
      },
      superAdministrator: {
        connect: { id: props.superAdministrator.id },
      },
    } satisfies Prisma.shopping_mall_administrator_grade_changesCreateInput;
  }
}
