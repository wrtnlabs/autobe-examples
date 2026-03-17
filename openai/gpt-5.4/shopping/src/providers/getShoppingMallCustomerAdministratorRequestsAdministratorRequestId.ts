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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdministratorRequestTransformer } from "../transformers/ShoppingMallAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerAdministratorRequestsAdministratorRequestId(props: {
  customer: CustomerPayload;
  administratorRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorRequest> {
  const superAdministrator =
    await MyGlobal.prisma.shopping_mall_super_administrators.findFirst({
      where: {
        id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        active: true,
      },
    });
  if (superAdministrator === null || superAdministrator.active === false) {
    throw new HttpException("Forbidden", 403);
  }
  const administratorRequest =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow(
      {
        where: {
          id: props.administratorRequestId,
        },
        ...ShoppingMallAdministratorRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorRequestTransformer.transform(
    administratorRequest,
  );
}
