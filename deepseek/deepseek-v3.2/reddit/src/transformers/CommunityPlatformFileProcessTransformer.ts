import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformFileAtSummaryTransformer } from "./CommunityPlatformFileAtSummaryTransformer";

export namespace CommunityPlatformFileProcessTransformer {
  export type Payload = Prisma.community_platform_file_processesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        started_at: true,
        completed_at: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        file: CommunityPlatformFileAtSummaryTransformer.select(),
        steps: true,
      },
    } satisfies Prisma.community_platform_file_processesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFileProcess> {
    return {
      id: input.id,
      started_at: input.started_at?.toISOString() ?? null,
      completed_at: input.completed_at?.toISOString() ?? null,
      error_message: input.error_message ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      file: await CommunityPlatformFileAtSummaryTransformer.transform(
        input.file,
      ),
    };
  }
}
