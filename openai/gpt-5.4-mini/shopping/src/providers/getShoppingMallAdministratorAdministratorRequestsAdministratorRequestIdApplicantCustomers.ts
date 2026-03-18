import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantCustomers(props: {
  administrator: AdministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow({
    where: {
      id: props.administratorRequestId,
    },
  });
  const applicant =
    await MyGlobal.prisma.shopping_mall_administrator_request_applicant_customers.findUniqueOrThrow(
      {
        where: {
          shopping_mall_administrator_request_id: props.administratorRequestId,
        },
        select: {
          customer: ShoppingMallCustomerTransformer.select(),
        },
      },
    );
  return await ShoppingMallCustomerTransformer.transform(applicant.customer);
}
