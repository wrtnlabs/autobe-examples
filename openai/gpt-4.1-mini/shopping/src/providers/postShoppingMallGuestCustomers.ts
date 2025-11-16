import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postShoppingMallGuestCustomers(props: {
  guest: GuestPayload;
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer> {
  try {
    const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
    const id: string & tags.Format<"uuid"> = v4();

    const hashedPassword = await PasswordUtil.hash(props.body.password);

    const created = await MyGlobal.prisma.shopping_mall_customers.create({
      data: {
        id,
        email: props.body.email,
        password_hash: hashedPassword,
        name: props.body.full_name,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id,
      email: created.email,
      full_name: created.name,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null
          ? toISOStringSafe(created.deleted_at)
          : null,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException("Email already exists", 400);
      }
    }
    throw error;
  }
}
