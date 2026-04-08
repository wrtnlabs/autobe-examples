import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformOrganizationAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_organizationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_organizationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformOrganization.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      currency: input.currency ?? undefined,
      timezone: input.timezone ?? undefined,
      fiscal_start_month: input.fiscal_start_month ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      owner: await HrmPlatformMemberAtSummaryTransformer.transform(input.owner),
    } satisfies IHrmPlatformOrganization.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformOrganizationAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_organizationsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             currency: true,
//             timezone: true,
//             fiscal_start_month: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             owner: HrmPlatformMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_organizationsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformOrganization.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   currency: {string},
//   timezone: {string},
//   fiscal_start_month: {integer},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   owner: await HrmPlatformMemberAtSummaryTransformer.transform(input.owner),
//         };
//       }
//     }
//--------------------------------------------------------------