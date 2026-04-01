import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { IHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsGuestAtSummaryTransformer } from "./HrmsGuestAtSummaryTransformer";

export namespace HrmsGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.hrms_guest_sessionsGetPayload<
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
        guest: HrmsGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrms_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsGuestSession.ISummary> {
    return {
      id: input.id,
      guest: await HrmsGuestAtSummaryTransformer.transform(input.guest),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? null,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    };
  }
}
