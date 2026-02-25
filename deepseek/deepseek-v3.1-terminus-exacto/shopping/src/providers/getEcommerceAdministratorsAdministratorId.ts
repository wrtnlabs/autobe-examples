import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceAdministratorTransformer } from "../transformers/EcommerceAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorsAdministratorId(props: {
  administratorId: string & tags.Format<"uuid">;
}): Promise<IEcommerceAdministrator> {
  const administrator =
    await MyGlobal.prisma.ecommerce_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      ...EcommerceAdministratorTransformer.select(),
    });
  return await EcommerceAdministratorTransformer.transform(administrator);
}
