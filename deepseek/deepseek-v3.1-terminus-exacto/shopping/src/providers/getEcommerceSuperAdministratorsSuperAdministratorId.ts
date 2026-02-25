import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceSuperAdministratorTransformer } from "../transformers/EcommerceSuperAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSuperAdministratorsSuperAdministratorId(props: {
  superAdministratorId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSuperAdministrator> {
  const superAdmin =
    await MyGlobal.prisma.ecommerce_super_administrators.findUniqueOrThrow({
      where: { id: props.superAdministratorId },
      ...EcommerceSuperAdministratorTransformer.select(),
    });
  return await EcommerceSuperAdministratorTransformer.transform(superAdmin);
}
