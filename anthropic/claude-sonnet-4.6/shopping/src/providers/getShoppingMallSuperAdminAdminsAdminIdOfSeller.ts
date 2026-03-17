import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminOfSellerTransformer } from "../transformers/ShoppingMallAdminOfSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminAdminsAdminIdOfSeller(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminOfSeller> {
  const record =
    await MyGlobal.prisma.shopping_mall_admin_of_sellers.findFirstOrThrow({
      where: { admin_id: props.adminId },
      ...ShoppingMallAdminOfSellerTransformer.select(),
    });
  return await ShoppingMallAdminOfSellerTransformer.transform(record);
}
