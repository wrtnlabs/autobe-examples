import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ShoppingMallAdministratorGradeChangeTransformer } from "../transformers/ShoppingMallAdministratorGradeChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdministratorAdministratorsAdministratorIdGradeChangesGradeChangeId(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  gradeChangeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorGradeChange> {
  await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
    where: {
      id: props.administratorId,
    },
    select: {
      id: true,
    },
  });
  const gradeChange =
    await MyGlobal.prisma.shopping_mall_administrator_grade_changes.findFirstOrThrow(
      {
        where: {
          id: props.gradeChangeId,
          shopping_mall_administrator_id: props.administratorId,
        },
        ...ShoppingMallAdministratorGradeChangeTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorGradeChangeTransformer.transform(
    gradeChange,
  );
}
