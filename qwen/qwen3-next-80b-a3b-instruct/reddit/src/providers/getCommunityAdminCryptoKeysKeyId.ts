import { ICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCryptoKey";
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

export async function getCommunityAdminCryptoKeysKeyId(props: {
  admin: AdminPayload;
  keyId: string & tags.Format<"uuid">;
}): Promise<ICommunityCryptoKey> {
  const key = await MyGlobal.prisma.community_crypto_keys.findUnique({
    where: {
      id: props.keyId,
      deleted_at: null,
    },
  });
  if (!key) {
    throw new HttpException("Key not found", 404);
  }
  return {
    id: key.id,
    key_value: key.key_value,
    key_type: key.key_type,
    algorithm: key.algorithm,
    status: key.status,
    key_metadata: key.key_metadata,
    created_at: toISOStringSafe(key.created_at),
    updated_at: toISOStringSafe(key.updated_at),
    deleted_at: key.deleted_at ? toISOStringSafe(key.deleted_at) : null,
  };
}
