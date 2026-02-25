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

export async function getEcommerceAdministratorAdministrativeActionsAdministrativeActionIdCustomerTargetsCustomerTargetId(props: {
  administrator: AdministratorPayload;
  administrativeActionId: string & tags.Format<"uuid">;
  customerTargetId: string & tags.Format<"uuid">;
}): Promise<IEcommerceAdminUserBanOfCustomer> {
  const customerTarget =
    await MyGlobal.prisma.ecommerce_administrative_action_of_customers.findUniqueOrThrow(
      {
        where: {
          id: props.customerTargetId,
          ecommerce_administrative_action_id: props.administrativeActionId,
        },
        ...EcommerceAdminUserBanOfCustomerTransformer.select(),
      },
    );
  return await EcommerceAdminUserBanOfCustomerTransformer.transform(
    customerTarget,
  );
}
