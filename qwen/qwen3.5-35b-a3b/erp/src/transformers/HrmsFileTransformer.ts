import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsMemberAtSummaryTransformer } from "./HrmsMemberAtSummaryTransformer";
import { HrmsOrganizationAtSummaryTransformer } from "./HrmsOrganizationAtSummaryTransformer";

export namespace HrmsFileTransformer {
  export type Payload = Prisma.hrms_filesGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        filename: true,
        storage_path: true,
        mime_type: true,
        file_size: true,
        file_category: true,
        owner_type: true,
        validation_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmsOrganizationAtSummaryTransformer.select(),
        owner: HrmsMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrms_filesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmsFile> {
    return {
      id: input.id,
      organization_id: input.organization.id,
      owner_id: input.owner?.id ?? undefined,
      filename: input.filename,
      storage_path: input.storage_path,
      mime_type: input.mime_type,
      file_size: input.file_size,
      file_category: input.file_category,
      owner_type: input.owner_type ?? undefined,
      validation_status: input.validation_status,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      organization: await HrmsOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      owner: input.owner
        ? await HrmsMemberAtSummaryTransformer.transform(input.owner)
        : null,
    };
  }
}
