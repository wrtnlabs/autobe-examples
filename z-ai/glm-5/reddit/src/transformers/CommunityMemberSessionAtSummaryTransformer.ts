import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.community_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        member: CommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityMemberSession.ISummary> {
    return {
      id: input.id,
      accessToken:
        input.access_token.length > 12
          ? input.access_token.slice(0, 8) +
            "..." +
            input.access_token.slice(-4)
          : input.access_token,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? null,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      member: await CommunityMemberAtSummaryTransformer.transform(input.member),
    };
  }
}
