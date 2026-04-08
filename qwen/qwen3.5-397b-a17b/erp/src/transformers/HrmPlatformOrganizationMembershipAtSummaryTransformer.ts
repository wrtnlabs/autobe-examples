import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationMembership";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformOrganizationMembershipAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_organization_membershipsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        is_owner: true,
        created_at: true,
        member: HrmPlatformMemberAtSummaryTransformer.select(),
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_organization_membershipsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformOrganizationMembership.ISummary> {
    return {
      id: input.id,
      isOwner: input.is_owner,
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      createdAt: input.created_at.toISOString(),
    } satisfies IHrmPlatformOrganizationMembership.ISummary;
  }
}
