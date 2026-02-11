import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

namespace CommunityMemberSessionTransformer {
  export type Payload = Prisma.community_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        member: {
          select: CommunityMemberAtSummaryTransformer.select(),
        },
      },
    } satisfies Prisma.community_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityMemberSession> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      expired_at: toISOStringSafe(input.expired_at),
      member: await CommunityMemberAtSummaryTransformer.transform(input.member),
    };
  }
}
