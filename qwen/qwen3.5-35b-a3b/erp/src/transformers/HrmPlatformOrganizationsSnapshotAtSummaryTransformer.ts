import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformOrganizationsSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_organizations_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        status: true,
        metadata: true,
        created_at: true,
        organization: true,
      },
    } satisfies Prisma.hrm_platform_organizations_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformOrganizationsSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      currency: input.currency,
      timezone: input.timezone ?? undefined,
      fiscal_start_month: input.fiscal_start_month ?? undefined,
      status: input.status,
      created_at: input.created_at.toISOString(),
    } satisfies IHrmPlatformOrganizationsSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformOrganizationsSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_organizations_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             logo_uri: true,
//             currency: true,
//             timezone: true,
//             fiscal_start_month: true,
//             status: true,
//             metadata: true,
//             created_at: true,
//             hrm_platform_organization_id: true,
//           },
//         } satisfies Prisma.hrm_platform_organizations_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformOrganizationsSnapshot.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {null | string},
//   currency: {string},
//   timezone: {null | string},
//   fiscal_start_month: {integer | null},
//   status: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------