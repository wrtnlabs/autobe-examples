import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformProfileTransformer } from "./CommunityPlatformProfileTransformer";

export namespace CommunityPlatformMemberTransformer {
  export type Payload = Prisma.community_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        email: true,
        email_verified: true,
        status: true,
        last_signed_in_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: CommunityPlatformProfileTransformer.select(),
      },
    } satisfies Prisma.community_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMember> {
    if (input.profile === null) {
      throw new Error("Community platform member profile is required.");
    }
    return {
      id: input.id,
      code: input.code,
      email: input.email,
      emailVerified: input.email_verified,
      status: input.status,
      lastSignedInAt: input.last_signed_in_at
        ? toISOStringSafe(input.last_signed_in_at)
        : null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      profile: await CommunityPlatformProfileTransformer.transform(
        input.profile,
      ),
    };
  }
}
