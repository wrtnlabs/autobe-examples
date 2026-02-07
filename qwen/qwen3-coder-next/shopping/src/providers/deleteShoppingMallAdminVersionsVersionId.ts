import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminVersionsVersionId(props: {
  admin: AdminPayload;
  versionId: string;
}): Promise<void> {
  const version =
    await MyGlobal.prisma.shopping_mall_systematic_versions.findUnique({
      where: { id: props.versionId },
    });
  if (!version) {
    throw new HttpException("Version not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_systematic_versions.delete({
    where: { id: props.versionId },
  });
}
