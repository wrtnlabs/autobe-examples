import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformMemberSessionTransformer {
  export type Payload = Prisma.hrm_platform_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        member: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformMemberSession> {
    return {
      id: input.id,
      access_token: input.access_token,
      refresh_token: input.refresh_token,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
