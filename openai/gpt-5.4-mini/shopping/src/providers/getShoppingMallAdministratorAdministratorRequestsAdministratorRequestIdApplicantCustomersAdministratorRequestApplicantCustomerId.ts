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

export async function getShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantCustomersAdministratorRequestApplicantCustomerId(props: {
  administrator: AdministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
  administratorRequestApplicantCustomerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorRequestApplicantCustomer> {
  const applicantCustomer =
    await MyGlobal.prisma.shopping_mall_administrator_request_applicant_customers.findFirstOrThrow(
      {
        where: {
          id: props.administratorRequestApplicantCustomerId,
          shopping_mall_administrator_request_id: props.administratorRequestId,
          deleted_at: null,
        },
        ...ShoppingMallAdministratorRequestApplicantCustomerTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorRequestApplicantCustomerTransformer.transform(
    applicantCustomer,
  );
}
