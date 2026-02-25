import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSystemVersionTransformer } from "../transformers/ShoppingMallSystemVersionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorSystemVersionsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallSystemVersion.IUpdate;
}): Promise<IShoppingMallSystemVersion> {
  const existing =
    await MyGlobal.prisma.shopping_mall_system_versions.findUniqueOrThrow({
      where: { id: props.id },
    });
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const updated = await MyGlobal.prisma.shopping_mall_system_versions.update({
    where: { id: props.id },
    data: {
      change_description: props.body.change_description ?? null,
      changed_by: props.body.changed_by ?? null,
      updated_at: now,
    },
  });
  return await ShoppingMallSystemVersionTransformer.transform(updated);
}
