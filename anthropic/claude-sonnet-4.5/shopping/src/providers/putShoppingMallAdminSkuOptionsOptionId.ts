import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminSkuOptionsOptionId(props: {
  admin: AdminPayload;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallSkuOption.IUpdate;
}): Promise<IShoppingMallSkuOption> {
  const { optionId, body } = props;

  // Verify the SKU option exists
  const existingOption =
    await MyGlobal.prisma.shopping_mall_sku_options.findUniqueOrThrow({
      where: { id: optionId },
    });

  // If option_value is provided, check uniqueness constraint
  if (body.option_value !== undefined) {
    const duplicate = await MyGlobal.prisma.shopping_mall_sku_options.findFirst(
      {
        where: {
          option_name: existingOption.option_name,
          option_value: body.option_value,
          id: { not: optionId },
        },
      },
    );

    if (duplicate !== null) {
      throw new HttpException(
        "A SKU option with this name and value combination already exists",
        409,
      );
    }
  }

  // Perform update
  const updated = await MyGlobal.prisma.shopping_mall_sku_options.update({
    where: { id: optionId },
    data: {
      option_value: body.option_value ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    option_name: updated.option_name,
    option_value: updated.option_value,
  };
}
