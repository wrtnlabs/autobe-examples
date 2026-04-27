import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackingOrganizationFileAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_organization_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        extension: true,
        mime_type: true,
        size: true,
        url: true,
        type: true,
        version: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_organization_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingOrganizationFile.ISummary> {
    return {
      id: input.id,
      name: input.name,
      extension: input.extension,
      mime_type: input.mime_type,
      size: input.size,
      type: input.type,
      version: input.version,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmTimeTrackingOrganizationFile.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingOrganizationFileAtSummaryTransformer {
//       export type Payload = Prisma.hrm_time_tracking_organization_filesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             extension: true,
//             mime_type: true,
//             size: true,
//             url: true,
//             type: true,
//             version: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_organization_filesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingOrganizationFile.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   extension: {string},
//   mime_type: {string},
//   size: {integer},
//   type: {string},
//   version: {integer | null},
//   organization: await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(input.organization),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------