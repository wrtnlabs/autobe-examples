import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberSession";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsMemberAtSummaryTransformer } from "./HrmsMemberAtSummaryTransformer";
import { HrmsOrganizationAtSummaryTransformer } from "./HrmsOrganizationAtSummaryTransformer";

export namespace HrmsMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.hrms_member_sessionsGetPayload<
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
        user_agent: true,
        created_at: true,
        expired_at: true,
        member: HrmsMemberAtSummaryTransformer.select(),
        currentOrganization: HrmsOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrms_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsMemberSession.ISummary> {
    return {
      id: input.id,
      hrms_member_id: input.member.id,
      current_organization_id: input.currentOrganization?.id ?? null,
      currentOrganization: input.currentOrganization
        ? await HrmsOrganizationAtSummaryTransformer.transform(
            input.currentOrganization,
          )
        : null,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      user_agent: input.user_agent,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IHrmsMemberSession.ISummary;
  }
}
