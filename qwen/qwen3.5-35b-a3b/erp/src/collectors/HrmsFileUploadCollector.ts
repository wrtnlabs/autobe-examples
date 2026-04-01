import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmsFileUploadCollector {
  export async function collect(props: {
    body: IHrmsFileUpload.ICreate;
    member: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      original_filename: props.body.original_filename,
      file_type: props.body.file_type,
      file_size: props.body.file_size,
      validation_status: "pending",
      temporary_storage_path: `/uploads/temp/${id}`,
      permanent_storage_path: null,
      upload_state: "pending",
      error_message: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.body.organization_id } },
      member: { connect: { id: props.member.id } },
      file: undefined,
    } satisfies Prisma.hrms_file_uploadsCreateInput;
  }
}
