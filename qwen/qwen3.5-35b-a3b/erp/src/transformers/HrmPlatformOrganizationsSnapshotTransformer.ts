import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformOrganizationsSnapshotTransformer {
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
  ): Promise<IHrmPlatformOrganizationsSnapshot> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      logo_uri: input.logo_uri ?? null,
      currency: input.currency,
      timezone: input.timezone ?? null,
      fiscal_start_month: input.fiscal_start_month ?? null,
      status: input.status,
      metadata: input.metadata ?? null,
      created_at: input.created_at.toISOString(),
      hrm_platform_organization_id: input.organization.id,
    } satisfies IHrmPlatformOrganizationsSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformOrganizationsSnapshotTransformer {
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
//       export async function transform(input: Payload): Promise<IHrmPlatformOrganizationsSnapshot> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   logo_uri: {string | null},
//   currency: {string},
//   timezone: {string | null},
//   fiscal_start_month: {integer | null},
//   status: {string},
//   metadata: {string | null},
//   created_at: {string},
//   hrm_platform_organization_id: {string},
//         };
//       }
//     }
//--------------------------------------------------------------