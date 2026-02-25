import { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceAdminUserBanOfAdministratorCollector } from "../collectors/EcommerceAdminUserBanOfAdministratorCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAdminUserBanOfAdministratorTransformer } from "../transformers/EcommerceAdminUserBanOfAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorAdministrativeActionsAdministrativeActionIdProductActions(props: {
  administrator: AdministratorPayload;
  administrativeActionId: string & tags.Format<"uuid">;
  body: IEcommerceAdminUserBanOfAdministrator.ICreate;
}): Promise<IEcommerceAdminUserBanOfAdministrator> {
  // Validate that the administrative action exists
  const administrativeAction =
    await MyGlobal.prisma.ecommerce_administrative_actions.findUnique({
      where: { id: props.administrativeActionId },
    });
  if (!administrativeAction) {
    throw new HttpException("Administrative action not found", 404);
  }
  // Validate that the target product exists
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.body.product_id },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Use collector to transform request body into database input
  const data = await EcommerceAdminUserBanOfAdministratorCollector.collect({
    body: props.body,
    ecommerceAdministrativeActions: { id: props.administrativeActionId },
  });
  // Create the product action record
  const created =
    await MyGlobal.prisma.ecommerce_administrative_action_of_products.create({
      data,
      ...EcommerceAdminUserBanOfAdministratorTransformer.select(),
    });
  // Transform and return the complete record
  return await EcommerceAdminUserBanOfAdministratorTransformer.transform(
    created,
  );
}
