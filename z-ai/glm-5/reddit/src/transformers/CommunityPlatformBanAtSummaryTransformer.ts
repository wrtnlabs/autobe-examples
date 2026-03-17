import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformBanAtSummaryTransformer {
  export type Payload = Prisma.community_platform_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformBan.ISummary> {
    return {
      id: input.id,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      reason: input.reason,
      created_at: input.created_at.toISOString(),
    };
  }
}
