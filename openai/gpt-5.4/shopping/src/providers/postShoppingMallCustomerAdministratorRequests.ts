import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdministratorRequestCollector } from "../collectors/ShoppingMallAdministratorRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdministratorRequestTransformer } from "../transformers/ShoppingMallAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerAdministratorRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallAdministratorRequest.ICreate;
}): Promise<IShoppingMallAdministratorRequest> {
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findFirstOrThrow({
      where: {
        id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
      },
    });
  await MyGlobal.prisma.shopping_mall_customer_sessions.findFirstOrThrow({
    where: {
      id: props.customer.session_id,
      shopping_mall_customer_id: props.customer.id,
      expired_at: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
    },
  });
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findFirst({
      where: {
        email: customer.email,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (administrator !== null) {
    throw new HttpException("Already an administrator", 400);
  }
  const requestId = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.shopping_mall_administrator_requests.create({
      data: await ShoppingMallAdministratorRequestCollector.collect({
        body: props.body,
        customer: {
          id: props.customer.id,
        },
        session: {
          id: props.customer.session_id,
        },
      }),
      select: {
        id: true,
      },
    });
    await tx.shopping_mall_administrator_request_of_customers.create({
      data: {
        id: v4(),
        administratorRequest: {
          connect: {
            id: created.id,
          },
        },
        customer: {
          connect: {
            id: props.customer.id,
          },
        },
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return created.id;
  });
  const created =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow(
      {
        where: {
          id: requestId,
        },
        ...ShoppingMallAdministratorRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorRequestTransformer.transform(created);
}
