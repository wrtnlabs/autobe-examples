import { ICommunityApiKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityApiKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityApiKeyTransformer } from "../transformers/CommunityApiKeyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminApiKeysKeyId(props: {
  admin: AdminPayload;
  keyId: string;
}): Promise<ICommunityApiKey> {
  const apiKey = await MyGlobal.prisma.community_api_keys.findUnique({
    where: { id: props.keyId },
    ...CommunityApiKeyTransformer.select(),
  });
  if (!apiKey) {
    throw new HttpException("API key not found", 404);
  }
  // Check if admin is creator or admin
  if (apiKey.creator?.id !== props.admin.id && props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  return await CommunityApiKeyTransformer.transform(apiKey);
}
