import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorGradeHistoryTransformer } from "../transformers/ShoppingMallAdministratorGradeHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorAdministratorGradeHistoriesAdministratorGradeHistoryId(props: {
  administrator: AdministratorPayload;
  administratorGradeHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorGradeHistory> {
  const history =
    await MyGlobal.prisma.shopping_mall_administrator_grade_histories.findUniqueOrThrow(
      {
        where: {
          id: props.administratorGradeHistoryId,
        },
        ...ShoppingMallAdministratorGradeHistoryTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorGradeHistoryTransformer.transform(
    history,
  );
}
