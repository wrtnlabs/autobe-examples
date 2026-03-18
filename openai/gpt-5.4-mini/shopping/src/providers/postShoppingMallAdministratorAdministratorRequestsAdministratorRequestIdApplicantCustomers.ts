import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { IShoppingMallAdministratorRequestApplicantCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestApplicantCustomer";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorRequestApplicantCustomerTransformer } from "../transformers/ShoppingMallAdministratorRequestApplicantCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantCustomers(props: {
  administrator: AdministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorRequestApplicantCustomer> {
  const existing =
    await MyGlobal.prisma.shopping_mall_administrator_request_applicant_customers.findUnique(
      {
        where: {
          shopping_mall_administrator_request_id: props.administratorRequestId,
        },
      },
    );
  if (existing !== null) {
    throw new HttpException("Conflict", 409);
  }
  const applicantCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: props.administrator.id },
      select: { id: true, account_status: true, deleted_at: true },
    });
  if (applicantCustomer === null || applicantCustomer.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow({
    where: { id: props.administratorRequestId },
    select: { id: true },
  });
  const created =
    await MyGlobal.prisma.shopping_mall_administrator_request_applicant_customers.create(
      {
        data: {
          id: v4(),
          administratorRequest: {
            connect: { id: props.administratorRequestId },
          },
          customer: {
            connect: { id: applicantCustomer.id },
          },
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        },
        ...ShoppingMallAdministratorRequestApplicantCustomerTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorRequestApplicantCustomerTransformer.transform(
    created,
  );
}
