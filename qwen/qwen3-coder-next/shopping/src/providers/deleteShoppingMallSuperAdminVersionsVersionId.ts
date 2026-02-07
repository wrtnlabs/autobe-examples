import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSuperAdminVersionsVersionId(props: {
  superAdmin: SuperadminPayload;
  versionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const result = await MyGlobal.prisma.shopping_mall_systematic_versions.delete(
    {
      where: {
        id: props.versionId,
      },
    },
  );
  if (result.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
}
