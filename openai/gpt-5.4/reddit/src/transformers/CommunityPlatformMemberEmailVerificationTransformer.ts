import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformMemberEmailVerificationTransformer {
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMemberEmailVerification> {
    return {
      id: input.id,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      token: input.token,
      status: input.status,
      verified_at: input.verified_at?.toISOString() ?? null,
      expired_at: input.expired_at.toISOString(),
      invalidated_at: input.invalidated_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        token: true,
        status: true,
        verified_at: true,
        expired_at: true,
        invalidated_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_member_email_verificationsFindManyArgs;
  }
  export type Payload =
    Prisma.community_platform_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
}
