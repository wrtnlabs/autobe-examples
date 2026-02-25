import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOversight";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommercePlatformOversightTransformer } from "../transformers/EcommercePlatformOversightTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorPlatformOversightsPlatformOversightId(props: {
  administrator: AdministratorPayload;
  platformOversightId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformOversight> {
  const oversight =
    await MyGlobal.prisma.ecommerce_platform_oversights.findUniqueOrThrow({
      where: { id: props.platformOversightId },
      ...EcommercePlatformOversightTransformer.select(),
    });
  return await EcommercePlatformOversightTransformer.transform(oversight);
}
