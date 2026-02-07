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

export async function deleteCommunityAdminCryptoKeysKeyId(props: {
  admin: AdminPayload;
  keyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const key = await MyGlobal.prisma.community_crypto_keys.findUnique({
    where: {
      id: props.keyId,
      deleted_at: null,
    },
  });
  if (!key) {
    throw new HttpException("Key not found", 404);
  }
  if (key.status === "active") {
    throw new HttpException("Cannot delete active key", 400);
  }
  await MyGlobal.prisma.community_crypto_keys.delete({
    where: {
      id: props.keyId,
    },
  });
}
