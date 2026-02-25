import { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceAdminUserBanOfCustomerCollector } from "../collectors/EcommerceAdminUserBanOfCustomerCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAdminUserBanOfCustomerTransformer } from "../transformers/EcommerceAdminUserBanOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorAdministrativeActionsAdministrativeActionIdCustomerTargets(props: {
  administrator: AdministratorPayload;
  administrativeActionId: string & tags.Format<"uuid">;
  body: IEcommerceAdminUserBanOfCustomer.ICreate;
}): Promise<IEcommerceAdminUserBanOfCustomer> {
  // Verify administrative action exists and is active
  const administrativeAction =
    await MyGlobal.prisma.ecommerce_administrative_actions.findUniqueOrThrow({
      where: { id: props.administrativeActionId },
    });
  // Verify customer exists and is active
  const customer = await MyGlobal.prisma.ecommerce_customers.findUniqueOrThrow({
    where: { id: props.body.ecommerce_customer_id },
  });
  // Check for existing customer targeting record to prevent duplicates
  const existingTarget =
    await MyGlobal.prisma.ecommerce_administrative_action_of_customers.findFirst(
      {
        where: {
          ecommerce_administrative_action_id: props.administrativeActionId,
          ecommerce_customer_id: props.body.ecommerce_customer_id,
          deleted_at: null,
        },
      },
    );
  if (existingTarget) {
    throw new HttpException(
      "Customer is already targeted by this administrative action",
      400,
    );
  }
  // Create customer targeting record
  const targetingRecord =
    await MyGlobal.prisma.ecommerce_administrative_action_of_customers.create({
      data: await EcommerceAdminUserBanOfCustomerCollector.collect({
        body: props.body,
        ecommerceAdministrativeActions: administrativeAction,
        ecommerceAdminUserBans: customer,
      }),
      ...EcommerceAdminUserBanOfCustomerTransformer.select(),
    });
  return await EcommerceAdminUserBanOfCustomerTransformer.transform(
    targetingRecord,
  );
}
