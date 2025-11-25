import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallCustomers(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer> {
  try {
    const hashedPassword = await PasswordUtil.hash(props.body.password);
    const now = toISOStringSafe(new Date());

    const created = await MyGlobal.prisma.shopping_mall_customers.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id,
      email: created.email,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes("email")
      ) {
        throw new HttpException("Email already exists", 400);
      }
    }
    throw error;
  }
}
