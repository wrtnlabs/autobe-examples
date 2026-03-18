import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IUploadRequestValidationStatusResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IUploadRequestValidationStatusResponse";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace UploadRequestValidationStatusResponseTransformer {
  export type Payload = Prisma.hrms_file_uploadsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        validation_status: true,
        permanent_storage_path: true,
        upload_state: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        file: true,
      },
    } satisfies Prisma.hrms_file_uploadsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IUploadRequestValidationStatusResponse> {
    return {
      validationStatus: input.validation_status,
      uploadState: input.upload_state,
      errorMessage: input.error_message ?? null,
      fileId: input.file?.id ?? null,
      permanentStoragePath: input.permanent_storage_path ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
