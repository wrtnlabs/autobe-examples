import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformUserEmailVerificationTransformer {
  export type Payload =
    Prisma.community_platform_user_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_user_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformUserEmailVerification> {
    // Compute status based on verified_at, expires_at, and current time
    const now = new Date();
    let status: "verified" | "expired" | "already_verified" | "invalid";
    if (input.verified_at) {
      status = "verified";
    } else if (input.expires_at < now) {
      status = "expired";
    } else {
      status = "invalid";
    }
    return {
      id: input.id,
      status,
      actor_type: "user",
      actor: input.user
        ? await CommunityPlatformUserAtSummaryTransformer.transform(input.user)
        : undefined,
      expires_at: input.expires_at.toISOString(),
      verified_at: input.verified_at ? input.verified_at.toISOString() : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
