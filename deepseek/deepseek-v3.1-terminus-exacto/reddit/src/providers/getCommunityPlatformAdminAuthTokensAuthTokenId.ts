import { ICommunityPlatformAuthToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformAuthTokenAtReferenceTransformer } from "../transformers/CommunityPlatformAuthTokenAtReferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminAuthTokensAuthTokenId(props: {
  admin: AdminPayload;
  authTokenId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAuthToken.IReference> {
  const token =
    await MyGlobal.prisma.community_platform_auth_tokens.findUniqueOrThrow({
      where: { id: props.authTokenId },
      ...CommunityPlatformAuthTokenAtReferenceTransformer.select(),
    });
  return await CommunityPlatformAuthTokenAtReferenceTransformer.transform(
    token,
  );
}
