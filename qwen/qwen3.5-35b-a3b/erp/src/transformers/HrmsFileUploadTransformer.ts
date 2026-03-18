import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsFileTransformer } from "./HrmsFileTransformer";
import { HrmsMemberAtSummaryTransformer } from "./HrmsMemberAtSummaryTransformer";
import { HrmsOrganizationAtSummaryTransformer } from "./HrmsOrganizationAtSummaryTransformer";

export namespace HrmsFileUploadTransformer {
  export type Payload = Prisma.hrms_file_uploadsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        original_filename: true,
        file_type: true,
        file_size: true,
        validation_status: true,
        temporary_storage_path: true,
        permanent_storage_path: true,
        upload_state: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmsOrganizationAtSummaryTransformer.select(),
        member: HrmsMemberAtSummaryTransformer.select(),
        file: HrmsFileTransformer.select(),
      },
    } satisfies Prisma.hrms_file_uploadsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmsFileUpload> {
    return {
      id: input.id,
      organization_id: input.organization.id,
      member_id: input.member.id,
      file_id: input.file?.id ?? undefined,
      original_filename: input.original_filename,
      file_type: input.file_type,
      file_size: input.file_size,
      validation_status: input.validation_status,
      temporary_storage_path: input.temporary_storage_path,
      permanent_storage_path: input.permanent_storage_path ?? undefined,
      upload_state: input.upload_state,
      error_message: input.error_message ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization: await HrmsOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      member: await HrmsMemberAtSummaryTransformer.transform(input.member),
      file: input.file ? await HrmsFileTransformer.transform(input.file) : null,
    } satisfies IHrmsFileUpload;
  }
}
