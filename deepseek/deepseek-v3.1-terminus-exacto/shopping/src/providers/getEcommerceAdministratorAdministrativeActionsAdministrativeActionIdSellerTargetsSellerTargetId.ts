import { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAdminUserBanOfSellerTransformer } from "../transformers/EcommerceAdminUserBanOfSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorAdministrativeActionsAdministrativeActionIdSellerTargetsSellerTargetId(props: {
  administrator: AdministratorPayload;
  administrativeActionId: string & tags.Format<"uuid">;
  sellerTargetId: string & tags.Format<"uuid">;
}): Promise<IEcommerceAdminUserBanOfSeller> {
  const sellerTarget =
    await MyGlobal.prisma.ecommerce_administrative_action_of_sellers.findUniqueOrThrow(
      {
        where: {
          ecommerce_administrative_action_id_ecommerce_seller_id: {
            ecommerce_administrative_action_id: props.administrativeActionId,
            ecommerce_seller_id: props.sellerTargetId,
          },
        },
        ...EcommerceAdminUserBanOfSellerTransformer.select(),
      },
    );
  return await EcommerceAdminUserBanOfSellerTransformer.transform(sellerTarget);
}
