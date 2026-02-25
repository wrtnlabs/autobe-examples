import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCacheConfigurationSnapshotTransformer } from "../transformers/EcommerceCacheConfigurationSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorAdminSellerSuspensionsAdminSellerSuspensionId(props: {
  administrator: AdministratorPayload;
  adminSellerSuspensionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCacheConfigurationSnapshot> {
  const suspension =
    await MyGlobal.prisma.ecommerce_admin_seller_suspensions.findUniqueOrThrow({
      where: { id: props.adminSellerSuspensionId },
      ...EcommerceCacheConfigurationSnapshotTransformer.select(),
    });
  return await EcommerceCacheConfigurationSnapshotTransformer.transform(
    suspension,
  );
}
