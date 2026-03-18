import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdministratorRequestCollector } from "../collectors/ShoppingMallAdministratorRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallAdministratorRequestTransformer } from "../transformers/ShoppingMallAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerAdministratorRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallAdministratorRequest.ICreate;
}): Promise<IShoppingMallAdministratorRequest> {
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const request = await prisma.shopping_mall_administrator_requests.create({
      data: await ShoppingMallAdministratorRequestCollector.collect({
        body: props.body,
      }),
    });
    await prisma.shopping_mall_administrator_request_applicant_sellers.create({
      data: {
        id: v4(),
        shopping_mall_administrator_request_id: request.id,
        shopping_mall_seller_id: props.seller.id,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return request;
  });
  const output =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow(
      {
        where: { id: created.id },
        ...ShoppingMallAdministratorRequestTransformer.select(),
      },
    );
  return ShoppingMallAdministratorRequestTransformer.transform(output);
}
