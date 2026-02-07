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

export async function putCommunityAdminCryptoKeysKeyId(props: {
  admin: AdminPayload;
  keyId: string & tags.Format<"uuid">;
  body: ICommunityCryptoKey;
}): Promise<ICommunityCryptoKey> {
  const key = await MyGlobal.prisma.community_crypto_keys.findUnique({
    where: {
      id: props.keyId,
      deleted_at: null,
    },
  });
  if (!key) {
    throw new HttpException("Crypto key not found", 404);
  }
  const now = toISOStringSafe(new Date());
  const updatedKey = await MyGlobal.prisma.community_crypto_keys.update({
    where: { id: props.keyId },
    data: {
      key_value: (props.body as any).key_value,
      key_type: (props.body as any).key_type,
      algorithm: (props.body as any).algorithm,
      status: (props.body as any).status,
      key_metadata: (props.body as any).key_metadata,
      updated_at: now,
    },
  });
  return {
    id: updatedKey.id as string & tags.Format<"uuid">,
    key_value: updatedKey.key_value,
    key_type: updatedKey.key_type,
    algorithm: updatedKey.algorithm,
    status: updatedKey.status,
    key_metadata: updatedKey.key_metadata,
    created_at: toISOStringSafe(updatedKey.created_at),
    updated_at: toISOStringSafe(updatedKey.updated_at),
  };
}
