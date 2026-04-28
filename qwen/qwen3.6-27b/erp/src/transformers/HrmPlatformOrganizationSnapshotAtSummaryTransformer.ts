import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformOrganizationSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_organization_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_href: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        actingMember: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_organization_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformOrganizationSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      logoHref: input.logo_href,
      currency: input.currency,
      timezone: input.timezone,
      fiscalStartMonth: input.fiscal_start_month,
      actingMember: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.actingMember,
      ),
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      createdAt: input.created_at.toISOString(),
    } satisfies IHrmPlatformOrganizationSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformOrganizationSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_organization_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             logo_href: true,
//             currency: true,
//             timezone: true,
//             fiscal_start_month: true,
//             created_at: true,
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//             actingMember: HrmPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_organization_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformOrganizationSnapshot.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   logoHref: {string | null},
//   currency: {string},
//   timezone: {string},
//   fiscalStartMonth: {integer},
//   actingMember: await HrmPlatformMemberAtSummaryTransformer.transform(input.actingMember),
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------