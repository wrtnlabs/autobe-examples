import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdministratorTransformer } from "../transformers/ShoppingMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSuperAdminAdministratorsAdministratorId(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministrator.IUpdate;
}): Promise<IShoppingMallAdministrator> {
  const admin =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      select: {
        id: true,
        grade: true,
        deleted_at: true,
        shopping_mall_member_id: true,
      },
    });
  if (admin.deleted_at !== null) {
    throw new HttpException("Administrator is already soft deleted", 400);
  }
  if (
    props.body.grade === "regular" &&
    admin.grade === "super" &&
    admin.shopping_mall_member_id === props.superAdmin.id
  ) {
    throw new HttpException(
      "Super administrators cannot demote themselves",
      403,
    );
  }
  await MyGlobal.prisma.shopping_mall_administrators.update({
    where: { id: props.administratorId },
    data: {
      ...(props.body.grade !== undefined && { grade: props.body.grade }),
      ...(props.body.grade === "super" && { deleted_at: null }),
      ...(props.body.grade === "regular" &&
        admin.grade === "super" && { deleted_at: new Date() }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      ...ShoppingMallAdministratorTransformer.select(),
    });
  return await ShoppingMallAdministratorTransformer.transform(updated);
}
