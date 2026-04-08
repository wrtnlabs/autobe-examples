import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformOrganizationFileAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_organization_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_key: true,
        file_name: true,
        file_type: true,
        file_size: true,
        storage_type: true,
        url: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        member: true,
      },
    } satisfies Prisma.hrm_platform_organization_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformOrganizationFile.ISummary> {
    return {
      id: input.id,
      file_name: input.file_name,
      file_type: input.file_type,
      file_size: input.file_size,
      status: input.status,
      url: input.url ?? null,
      file_key: input.file_key,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmPlatformOrganizationFile.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformOrganizationFileAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_organization_filesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             file_key: true,
//             file_name: true,
//             file_type: true,
//             file_size: true,
//             storage_type: true,
//             url: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//             hrm_platform_member_id: true,
//           },
//         } satisfies Prisma.hrm_platform_organization_filesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformOrganizationFile.ISummary> {
//         return {
//   id: {string},
//   file_name: {string},
//   file_type: {string},
//   file_size: {integer},
//   status: {string},
//   url: {string | null},
//   file_key: {string},
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------