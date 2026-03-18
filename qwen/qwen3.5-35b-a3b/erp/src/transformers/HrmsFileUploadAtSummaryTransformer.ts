import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsFileUploadAtSummaryTransformer {
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
        organization: {
          select: {
            id: true,
            name: true,
          },
        } satisfies Prisma.hrms_organizationsFindManyArgs,
        member: {
          select: {
            id: true,
            email: true,
          },
        } satisfies Prisma.hrms_membersFindManyArgs,
        file: {
          select: {
            id: true,
          },
        } satisfies Prisma.hrms_filesFindManyArgs,
      },
    } satisfies Prisma.hrms_file_uploadsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsFileUpload.ISummary> {
    return {
      id: input.id,
      originalFilename: input.original_filename,
      fileType: input.file_type,
      fileSize: input.file_size,
      validationStatus: input.validation_status,
      uploadState: input.upload_state,
      createdAt: input.created_at.toISOString(),
      fileId: input.file?.id ?? undefined,
      permanentStoragePath: input.permanent_storage_path ?? undefined,
      errorMessage: input.error_message ?? undefined,
    };
  }
}
