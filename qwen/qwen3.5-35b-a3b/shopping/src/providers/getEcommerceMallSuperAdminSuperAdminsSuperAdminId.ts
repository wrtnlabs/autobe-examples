import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { EcommerceMallSuperAdminTransformer } from "../transformers/EcommerceMallSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminSuperAdminsSuperAdminId(props: {
  superAdmin: SuperAdminPayload;
  superAdminId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSuperAdmin> {
  const result =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findUniqueOrThrow({
      where: { id: props.superAdminId },
      ...EcommerceMallSuperAdminTransformer.select(),
    });
  return await EcommerceMallSuperAdminTransformer.transform(result);
}
