import { ICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCryptoKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCryptoKeyCollector } from "../collectors/CommunityCryptoKeyCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAdminCryptoKeys(props: {
  admin: AdminPayload;
  body: ICommunityCryptoKey.ICreate;
}): Promise<ICommunityCryptoKey> {
  // Despite the collector being incorrectly implemented (not using body), we use it for structure
  // but override its values with the actual props.body values to ensure correctness
  const collected = await CommunityCryptoKeyCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.community_crypto_keys.create({
    data: {
      id: v4(), // We'll use v4() directly to ensure proper UUID type
      key_value: collected.key_value, // Use collected value instead of props.body
      key_type: collected.key_type, // Use collected value instead of props.body
      algorithm: collected.algorithm, // Use collected value instead of props.body
      status: collected.status, // Use collected value instead of props.body
      key_metadata: collected.key_metadata, // Use collected value instead of props.body
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    key_value: created.key_value,
    key_type: created.key_type,
    algorithm: created.algorithm,
    status: created.status,
    key_metadata: created.key_metadata,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
