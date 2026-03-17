import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSuperAdminAtSummaryTransformer } from "../transformers/ShoppingMallSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminSuperAdminsSuperAdminId(props: {
  superAdmin: SuperadminPayload;
  superAdminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSuperAdmin.ISummary> {
  const superAdmin =
    await MyGlobal.prisma.shopping_mall_super_admins.findUniqueOrThrow({
      where: {
        id: props.superAdminId,
        deleted_at: null,
      },
      ...ShoppingMallSuperAdminAtSummaryTransformer.select(),
    });
  return await ShoppingMallSuperAdminAtSummaryTransformer.transform(superAdmin);
}
