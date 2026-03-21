import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";

export namespace ErpHrmMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_member_sessionsGetPayload<
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
        updated_at: true,
        expired_at: true,
        member: ErpHrmMemberAtSummaryTransformer.select(),
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmMemberSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      organization: input.organization
        ? await ErpHrmOrganizationAtSummaryTransformer.transform(
            input.organization,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    };
  }
}
