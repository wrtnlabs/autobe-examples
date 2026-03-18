import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequestApplicantSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestApplicantSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorRequestApplicantSellerTransformer } from "../transformers/ShoppingMallAdministratorRequestApplicantSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantSellersAdministratorRequestApplicantSellerId(props: {
  administrator: AdministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
  administratorRequestApplicantSellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorRequestApplicantSeller> {
  const record =
    await MyGlobal.prisma.shopping_mall_administrator_request_applicant_sellers.findUniqueOrThrow(
      {
        where: {
          id: props.administratorRequestApplicantSellerId,
        },
        ...ShoppingMallAdministratorRequestApplicantSellerTransformer.select(),
      },
    );
  if (
    record.shopping_mall_administrator_request_id !==
    props.administratorRequestId
  ) {
    throw new HttpException("Not Found", 404);
  }
  return await ShoppingMallAdministratorRequestApplicantSellerTransformer.transform(
    record,
  );
}
