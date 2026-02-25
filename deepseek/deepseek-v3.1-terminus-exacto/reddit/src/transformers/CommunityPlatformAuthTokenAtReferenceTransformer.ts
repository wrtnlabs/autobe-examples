import { ICommunityPlatformAuthToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformAuthTokenAtReferenceTransformer {
  export type Payload = Prisma.community_platform_auth_tokensGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token_type: true,
        token_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expires_at: true,
        used_at: true,
        ip_address: true,
        user_agent: true,
        authTokenOfUser: true,
        moderatorToken: true,
        adminToken: true,
      },
    } satisfies Prisma.community_platform_auth_tokensFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformAuthToken.IReference> {
    return {
      id: input.id,
      token_type: input.token_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at ? input.used_at.toISOString() : null,
      ip_address: input.ip_address ?? null,
      user_agent: input.user_agent ?? null,
    };
  }
}
