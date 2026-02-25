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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAdminUserBanOfCustomerTransformer } from "../transformers/EcommerceAdminUserBanOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorAdminUserBansAdminUserBanIdCustomerBans(props: {
  administrator: AdministratorPayload;
  adminUserBanId: string & tags.Format<"uuid">;
  body: IEcommerceAdminUserBanOfCustomer.ICreate;
}): Promise<IEcommerceAdminUserBanOfCustomer> {
  // Validate admin user ban exists and is not deleted
  const adminUserBan =
    await MyGlobal.prisma.ecommerce_admin_user_bans.findFirst({
      where: {
        id: props.adminUserBanId,
        deleted_at: null,
      },
    });
  if (!adminUserBan) {
    throw new HttpException("Admin user ban not found", 404);
  }
  // Validate administrative action exists (no deleted_at check as schema doesn't support it)
  const administrativeAction =
    await MyGlobal.prisma.ecommerce_administrative_actions.findFirst({
      where: {
        id: props.body.ecommerce_administrative_action_id,
      },
    });
  if (!administrativeAction) {
    throw new HttpException("Administrative action not found", 404);
  }
  // Validate customer exists and is not deleted
  const customer = await MyGlobal.prisma.ecommerce_customers.findFirst({
    where: {
      id: props.body.ecommerce_customer_id,
      deleted_at: null,
    },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  // Check if relationship already exists
  const existing =
    await MyGlobal.prisma.ecommerce_administrative_action_of_customers.findFirst(
      {
        where: {
          ecommerce_administrative_action_id:
            props.body.ecommerce_administrative_action_id,
          ecommerce_customer_id: props.body.ecommerce_customer_id,
          deleted_at: null,
        },
      },
    );
  if (existing) {
    throw new HttpException(
      "Customer already banned under this administrative action",
      400,
    );
  }
  // Manual creation since collector expects complex entity references
  const data = {
    id: v4(),
    ecommerce_administrative_action_id:
      props.body.ecommerce_administrative_action_id,
    ecommerce_customer_id: props.body.ecommerce_customer_id,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };
  const created =
    await MyGlobal.prisma.ecommerce_administrative_action_of_customers.create({
      data,
      ...EcommerceAdminUserBanOfCustomerTransformer.select(),
    });
  return await EcommerceAdminUserBanOfCustomerTransformer.transform(created);
}
