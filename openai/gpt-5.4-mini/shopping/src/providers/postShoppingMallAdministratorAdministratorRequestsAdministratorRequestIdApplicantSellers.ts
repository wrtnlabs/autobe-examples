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

export async function postShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantSellers(props: {
  administrator: AdministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorRequestApplicantSeller.ICreate;
}): Promise<IShoppingMallAdministratorRequestApplicantSeller> {
  const administratorRequest =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow(
      {
        where: {
          id: props.administratorRequestId,
        },
        select: {
          id: true,
          status: true,
          deleted_at: true,
        },
      },
    );
  if (administratorRequest.deleted_at !== null) {
    throw new HttpException("Administrator request not found", 404);
  }
  if (administratorRequest.status !== "pending") {
    throw new HttpException(
      "Administrator request is not eligible for applicant assignment",
      409,
    );
  }
  const existingApplicant =
    await MyGlobal.prisma.shopping_mall_administrator_request_applicant_sellers.findUnique(
      {
        where: {
          shopping_mall_administrator_request_id: props.administratorRequestId,
        },
        select: {
          id: true,
        },
      },
    );
  if (existingApplicant !== null) {
    throw new HttpException(
      "Administrator request already has an applicant seller",
      409,
    );
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: {
      id: props.body.shopping_mall_seller_id,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (seller === null || seller.deleted_at !== null) {
    throw new HttpException("Seller applicant not found", 404);
  }
  const created =
    await MyGlobal.prisma.shopping_mall_administrator_request_applicant_sellers.create(
      {
        data: {
          id: v4(),
          shopping_mall_administrator_request_id: props.administratorRequestId,
          shopping_mall_seller_id: props.body.shopping_mall_seller_id,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        ...ShoppingMallAdministratorRequestApplicantSellerTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorRequestApplicantSellerTransformer.transform(
    created,
  );
}
